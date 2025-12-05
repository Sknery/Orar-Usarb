import { Injectable, Logger } from '@nestjs/common'; 
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, calendar_v3 } from 'googleapis'; //
import { UserToken } from './user-token.entity';
import { ScheduleEntry } from '../schedule/schedule.dto';
import { addDays, parseISO, addMinutes } from 'date-fns';

@Injectable()
export class GoogleCalendarService { 
  private readonly logger = new Logger(GoogleCalendarService.name);
  
  private G_CLIENT_ID: string;
  private G_CLIENT_SECRET: string;
  private G_REDIRECT_URI: string;
  private readonly EVENT_SIGNATURE = 'USARB_ORAR_EVENT_V1';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
  ) {
    this.G_CLIENT_ID = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
    this.G_CLIENT_SECRET = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
    this.G_REDIRECT_URI = this.configService.get<string>('GOOGLE_CALLBACK_URL') 
      || 'http://localhost:3000/google-calendar/oauth-callback'; 
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.G_CLIENT_ID,
      this.G_CLIENT_SECRET,
      this.G_REDIRECT_URI,
    );
  }

  getAuthUrl(userId: string): string {
    const oauth2Client = this.createOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', 
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        // --- НОВЫЕ SCOPES для получения профиля ---
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent', // Важно для получения refresh_token при смене аккаунта
      state: userId, 
    });
    return authUrl;
  }

  async handleOAuthCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuthClient();
    try {
      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      // Устанавливаем credentials, чтобы сделать запрос к UserInfo
      oauth2Client.setCredentials(tokens);

      // --- ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ПРОФИЛЕ ---
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2',
      });
      
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email;
      const name = userInfo.data.name;
      const picture = userInfo.data.picture;
      
      this.logger.log(`[${userId}] Авторизован аккаунт: ${email}`);

      if (!refreshToken) {
         // Если refresh_token не пришел (пользователь уже давал доступ),
         // пробуем найти существующую запись и обновить только профиль.
         // Но если записи нет, мы в тупике (нужен prompt: consent).
         const existing = await this.tokenRepository.findOne({ where: { id: userId } });
         if (existing) {
             existing.email = email || existing.email;
             existing.name = name || existing.name;
             existing.picture = picture || existing.picture;
             await this.tokenRepository.save(existing);
             return;
         }
         this.logger.warn(`[${userId}] REFRESH TOKEN не получен и запись не найдена.`);
      } else {
        const tokenEntry = this.tokenRepository.create({
          id: userId, 
          refreshToken: refreshToken,
          // Сохраняем данные профиля
          email: email || '',
          name: name || '',
          picture: picture || '',
        });
        await this.tokenRepository.save(tokenEntry);
        this.logger.log(`[${userId}] Токен и профиль успешно сохранены.`);
      }
    } catch (error: any) {
      this.logger.error(`Ошибка обмена кода: ${error.message}`);
      throw new Error('Eroare schimb token');
    }
  }

  // --- ОБНОВЛЕННЫЙ МЕТОД: Возвращаем не только boolean, но и данные ---
  async getConnectionStatus(userId: string): Promise<{ isConnected: boolean; email?: string; name?: string; picture?: string }> {
    const token = await this.tokenRepository.findOne({ where: { id: userId } });
    if (!token) {
        return { isConnected: false };
    }
    return { 
        isConnected: true,
        email: token.email,
        name: token.name,
        picture: token.picture
    };
  }
  
  // --- НОВЫЙ МЕТОД: Отключение пользователя ---
  async disconnectUser(userId: string): Promise<void> {
      await this.tokenRepository.delete({ id: userId });
      this.logger.log(`[${userId}] Пользователь отключил интеграцию.`);
  }

  // syncWeek оставляем без изменений, но используем createOAuthClient
  async syncWeek(lessons: ScheduleEntry[], weekStartDate: string, userId: string) {
    // ... (код syncWeek из предыдущих версий, используй тот, что был в проекте)
    // ВНИМАНИЕ: Для краткости я не дублирую весь метод syncWeek здесь, 
    // так как меняется только логика авторизации в начале файла.
    // Убедитесь, что внутри syncWeek используется this.createOAuthClient()
    
    // Начало метода для контекста:
    this.logger.log(`[syncWeek] User: ${userId}, Lessons: ${lessons.length}`);
    const userToken = await this.tokenRepository.findOne({ where: { id: userId } });
    if (!userToken || !userToken.refreshToken) {
      throw new Error('Utilizator neconectat (Token lipsă).');
    }

    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: userToken.refreshToken
    });
    
    // Дальше код такой же как был...
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const weekStart = parseISO(weekStartDate);
    const weekEnd = addDays(weekStart, 7);
    const timeZone = 'Europe/Chisinau';
    
    // ... остальная логика синхронизации ...
    // Вставь сюда старую логику удаления и создания ивентов
     try {
      const listParams: calendar_v3.Params$Resource$Events$List = {
        calendarId: 'primary',
        timeMin: weekStart.toISOString(),
        timeMax: weekEnd.toISOString(),
        privateExtendedProperty: [`app_name=${this.EVENT_SIGNATURE}`],
        showDeleted: false,
      };
      const eventsList = await calendar.events.list(listParams);
      const oldEvents = eventsList.data.items;

      if (oldEvents && oldEvents.length > 0) {
        for (const event of oldEvents) {
          if (event.id) {
            try {
              await calendar.events.delete({ calendarId: 'primary', eventId: event.id });
              await this.sleep(150);
            } catch (delErr: any) {
              this.logger.warn(`Ошибка удаления события ${event.id}: ${delErr.message}`);
            }
          }
        }
      }

      for (const lesson of lessons) {
        try {
          const startTime = parseISO(`${lesson.date}T${lesson.time}:00`);
          const endTime = addMinutes(startTime, 90);

          await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
              summary: lesson.subject,
              location: lesson.classroom,
              description: `Profesor: ${lesson.professor}\nTip: ${lesson.type}\nGrupa: ${lesson.group}\n\n(Sincronizat de Orar USARB App)`,
              start: { dateTime: startTime.toISOString(), timeZone },
              end: { dateTime: endTime.toISOString(), timeZone },
              extendedProperties: {
                private: { app_name: this.EVENT_SIGNATURE },
              },
              reminders: {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: 10 }],
              },
            },
          });
          await this.sleep(200);

        } catch (e: any) {
           this.logger.warn(`Ошибка добавления урока: ${e.message}`);
        }
      }
      
      return { success: true, count: lessons.length };
    } catch (error: any) {
       // Обработка ошибок как в старом коде
      if (error.code === 401 || error.message.includes('invalid_grant')) {
         await this.tokenRepository.delete({ id: userId });
      }
      throw new Error(`Eroare Google API: ${error.message}`);
    } 
  }

  async unsyncWeek(weekStartDate: string, userId: string): Promise<{ success: boolean; count: number }> {
    this.logger.log(`[unsyncWeek] User: ${userId}, StartDate: ${weekStartDate}`);

    const userToken = await this.tokenRepository.findOne({ where: { id: userId } });
    if (!userToken || !userToken.refreshToken) {
      throw new Error('Utilizator neconectat (Token lipsă).');
    }

    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: userToken.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Определяем диапазон времени (так же, как при синхронизации)
    const weekStart = parseISO(weekStartDate);
    const weekEnd = addDays(weekStart, 7);

    try {
      // 1. Ищем события с нашей подписью в этом диапазоне
      const listParams: calendar_v3.Params$Resource$Events$List = {
        calendarId: 'primary',
        timeMin: weekStart.toISOString(),
        timeMax: weekEnd.toISOString(),
        privateExtendedProperty: [`app_name=${this.EVENT_SIGNATURE}`], // Фильтруем только "наши" события
        showDeleted: false,
      };

      const eventsList = await calendar.events.list(listParams);
      const eventsToDelete = eventsList.data.items;
      let deletedCount = 0;

      if (eventsToDelete && eventsToDelete.length > 0) {
        this.logger.log(`[unsyncWeek] Found ${eventsToDelete.length} events to delete.`);
        
        // 2. Удаляем найденные события
        for (const event of eventsToDelete) {
          if (event.id) {
            try {
              await calendar.events.delete({ calendarId: 'primary', eventId: event.id });
              deletedCount++;
              // Небольшая задержка, чтобы не превысить лимиты Google API
              await this.sleep(100); 
            } catch (delErr: any) {
              this.logger.warn(`Ошибка удаления события ${event.id}: ${delErr.message}`);
            }
          }
        }
      } else {
        this.logger.log(`[unsyncWeek] No events found to delete.`);
      }

      return { success: true, count: deletedCount };

    } catch (error: any) {
      if (error.code === 401 || error.message.includes('invalid_grant')) {
        await this.tokenRepository.delete({ id: userId });
      }
      this.logger.error(`Eroare Google API (unsync): ${error.message}`);
      throw new Error(`Eroare la ștergerea din Google Calendar: ${error.message}`);
    }
  }
}