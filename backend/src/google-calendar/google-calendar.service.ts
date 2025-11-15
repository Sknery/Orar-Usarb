import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// --- ИСПРАВЛЕНИЕ 1: Убираем прямой импорт 'OAuth2Client' ---
// import { OAuth2Client } from 'google-auth-library'; (УДАЛЕНО)
// --- Импортируем 'Auth' из 'googleapis' ---
import { Auth, google, calendar_v3 } from 'googleapis'; 
import { UserToken } from './user-token.entity';
// --- НОВЫЕ ИМПОРТЫ ---
import { ScheduleEntry } from '../schedule/schedule.dto';
import { addDays, parseISO, addMinutes } from 'date-fns'; // <-- ДОБАВЛЕН 'addMinutes'
// --- КОНЕЦ НОВЫХ ИМПОРТОВ ---


@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  // --- ИСПРАВЛЕНИЕ 1: Используем тип Auth.OAuth2Client ---
  private oAuth2Client: Auth.OAuth2Client;
  private G_CLIENT_ID: string;
  private G_CLIENT_SECRET: string;
  private G_REDIRECT_URI = 'http://localhost:3000/google-calendar/oauth-callback';
  // --- НОВЫЙ ID ---
  private readonly EVENT_SIGNATURE = 'USARB_ORAR_EVENT_V1';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.error('!!! GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не найдены в .env !!!');
      throw new Error('Google OAuth Client ID/Secret не настроены.');
    }
    
    this.G_CLIENT_ID = clientId;
    this.G_CLIENT_SECRET = clientSecret;

    // --- ИСПРАВЛЕНИЕ 1: Используем 'google.auth.OAuth2' ---
    this.oAuth2Client = new google.auth.OAuth2(
      this.G_CLIENT_ID,
      this.G_CLIENT_SECRET,
      this.G_REDIRECT_URI,
    );
  }

  async onModuleInit() {
    await this.loadTokenFromDb();
  }
  
  /**
   * Загружает токен из БД и устанавливает его в oAuth2Client
   */
  private async loadTokenFromDb(): Promise<boolean> {
    const token = await this.getLatestToken();
    if (token) {
      this.oAuth2Client.setCredentials({
        refresh_token: token.refreshToken,
      });
      this.logger.log('loadTokenFromDb: Refresh токен загружен в oAuth2Client.');
      return true;
    } else {
      this.logger.warn('loadTokenFromDb: Refresh токен не найден в БД.');
      return false;
    }
  }

  /**
   * Генерирует URL для страницы согласия Google
   */
  getAuthUrl(): string {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline', 
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
      prompt: 'consent',
    });
    this.logger.log(`Сгенерирован Auth URL: ${authUrl}`);
    return authUrl;
  }

  /**
   * Обрабатывает колбэк от Google, получает токены и сохраняет refresh_token
   */
  async handleOAuthCallback(code: string): Promise<void> {
    try {
      this.logger.log('handleOAuthCallback: Обмен кода на токены...');
      const { tokens } = await this.oAuth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;
      
      if (!refreshToken) {
        this.logger.warn('!!! REFRESH TOKEN не получен.');
      } else {
        this.logger.log('✅ REFRESH TOKEN получен!');
        const newToken = this.tokenRepository.create({
          id: 1, 
          refreshToken: refreshToken,
        });
        await this.tokenRepository.save(newToken);
        this.logger.log(`✅ Токен успешно сохранен в БД. ID: ${newToken.id}`);
      }
      this.oAuth2Client.setCredentials(tokens);
    } catch (error) {
      this.logger.error(`Ошибка при обмене кода на токены: ${error.message}`);
      throw new Error('Ошибка обмена кода на токен');
    }
  }

  /**
   * Проверяет, есть ли у нас в БД токен.
   */
  async checkConnectionStatus(): Promise<boolean> {
    return this.loadTokenFromDb();
  }

  // ---
  // --- НОВАЯ ЛОГИКА: Синхронизация недели
  // ---
  
  /**
   * Синхронизирует (очищает и добавляет) уроки за неделю в Google Calendar
   */
  async syncWeek(lessons: ScheduleEntry[], weekStartDate: string) {
    this.logger.log(`[syncWeek] Запрос на синхронизацию ${lessons.length} уроков, начиная с ${weekStartDate}`);
    
    // 1. Убеждаемся, что oAuth2Client готов
    if (!this.oAuth2Client.credentials.refresh_token) {
      const loaded = await this.loadTokenFromDb();
      if (!loaded) {
        this.logger.error('[syncWeek] Ошибка: Попытка синхронизации без refresh_token в БД.');
        throw new Error('Utilizatorul не аутентифицирован (токен не найден).');
      }
    }

    // 2. Создаем клиент API Календаря
    // --- ИСПРАВЛЕНИЕ ОШИБКИ 1 (auth) ---
    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---
    
    // 3. Определяем временные рамки и ID для поиска
    const weekStart = parseISO(weekStartDate);
    const weekEnd = addDays(weekStart, 7); // 7 дней
    const timeZone = 'Europe/Chisinau';

    try {
      // 4. ОЧИСТКА: Ищем все *наши* старые события за эту неделю
      this.logger.log(`[syncWeek] Поиск старых событий для удаления (с ${weekStart.toISOString()} до ${weekEnd.toISOString()})...`);
      
      // --- ИСПРАВЛЕНИЕ ОШИБКИ 2 (list params) ---
      const listParams: calendar_v3.Params$Resource$Events$List = {
        calendarId: 'primary',
        timeMin: weekStart.toISOString(),
        timeMax: weekEnd.toISOString(),
        // --- ИСПРАВЛЕНИЕ: 'privateExtendedProperty' должен быть МАССИВОМ ---
        privateExtendedProperty: [`app_name=${this.EVENT_SIGNATURE}`], // Ищем только события с нашей меткой
        showDeleted: false,
      };
      const eventsToDeleteResponse = await calendar.events.list(listParams);
      // --- КОНЕЦ ИСПРАВЛЕНИЯ 2 ---

      // --- ИСПРАВЛЕНИЕ ОШИБКИ 3 (data.items) ---
      const oldEvents = eventsToDeleteResponse.data.items;
      // --- КОНЕЦ ИСПРАВЛЕНИЯ 3 ---

      if (oldEvents && oldEvents.length > 0) {
        this.logger.log(`[syncWeek] Найдено ${oldEvents.length} старых событий. Удаление...`);
        for (const event of oldEvents) {
          if (event.id) {
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: event.id,
            });
          }
        }
        this.logger.log(`[syncWeek] Старые события удалены.`);
      } else {
        this.logger.log(`[syncWeek] Старые события не найдены. Пропускаем удаление.`);
      }

      // 5. ДОБАВЛЕНИЕ: Создаем новые события
      this.logger.log(`[syncWeek] Добавление ${lessons.length} новых событий...`);
      for (const lesson of lessons) {
        try {
          // Расчет времени начала и конца (пара = 90 минут)
          const startTime = parseISO(`${lesson.date}T${lesson.time}:00`);
          const endTime = addMinutes(startTime, 90); // +90 минут

          const eventResource: calendar_v3.Schema$Event = {
            summary: lesson.subject,
            location: lesson.classroom,
            description: `Profesor: ${lesson.professor}\nTip: ${lesson.type}\nGrupa: ${lesson.group}\n\n(Sincronizat de Orar USARB App)`,
            start: {
              dateTime: startTime.toISOString(),
              timeZone: timeZone,
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: timeZone,
            },
            // Метка, чтобы мы могли найти это событие позже
            extendedProperties: {
              private: {
                app_name: this.EVENT_SIGNATURE,
              },
            },
            // Напоминание за 10 минут
            reminders: {
              useDefault: false,
              overrides: [{ method: 'popup', minutes: 10 }],
            },
          };

          // --- ИСПРАВЛЕНИЕ ОШИБКИ 4 (insert params) ---
          await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventResource, // 'resource' был заменен на 'requestBody'
          });
          // --- КОНЕЦ ИСПРАВЛЕНИЯ 4 ---
          
        } catch (lessonError) {
           this.logger.error(`[syncWeek] Ошибка при добавлении урока "${lesson.subject}": ${lessonError.message}`);
           // Не останавливаем весь процесс, если одна пара не удалась
        }
      }
      this.logger.log(`[syncWeek] ✅ Успешная синхронизация ${lessons.length} уроков.`);
      return { success: true, count: lessons.length };

    } catch (error) {
      this.logger.error(`[syncWeek] КРИТИЧЕСКАЯ ОШИБКА во время синхронизации: ${error.message}`, error.stack);
      
      if (error.code === 401) {
         this.logger.error('[syncWeek] Ошибка 401. Токен недействителен. Удаляем токен из БД.');
         // Если токен не сработал, удаляем его, чтобы
         // пользователь мог пройти аутентификацию заново.
         await this.tokenRepository.delete({ id: 1 });
      }
      
      throw new Error(`Eroare la sincronizare: ${error.message}`);
    }
  }


  // --- Вспомогательные методы ---

  private async getLatestToken(): Promise<UserToken | null> {
    try {
      const token = await this.tokenRepository.findOne({ where: { id: 1 } });
      return token || null;
    } catch (error) {
      this.logger.error('Ошибка при поиске токена в БД', error);
      return null;
    }
  }
}