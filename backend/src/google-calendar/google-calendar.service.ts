import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { UserToken } from './user-token.entity';

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oAuth2Client: OAuth2Client;
  private G_CLIENT_ID: string;
  private G_CLIENT_SECRET: string;
  // --- ИСПРАВЛЕНИЕ: Возвращаем наш "localhost" URI ---
  private G_REDIRECT_URI = 'http://localhost:3000/api/google-calendar/oauth-callback';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
  ) {
    // --- ИСПРАВЛЕНИЕ: Убеждаемся, что переменные загружены ---
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.error('!!! GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не найдены в .env !!!');
      throw new Error('Google OAuth Client ID/Secret не настроены.');
    }
    
    this.G_CLIENT_ID = clientId;
    this.G_CLIENT_SECRET = clientSecret;

    this.oAuth2Client = new OAuth2Client(
      this.G_CLIENT_ID,
      this.G_CLIENT_SECRET,
      this.G_REDIRECT_URI, // Используем URI отсюда
    );
  }

  async onModuleInit() {
    // При запуске можно проверить, есть ли токен в БД и настроить oAuth2Client
    const token = await this.getLatestToken();
    if (token) {
      this.oAuth2Client.setCredentials({
        refresh_token: token.refreshToken,
      });
      this.logger.log('onModuleInit: Refresh токен загружен в oAuth2Client.');
    }
  }

  /**
   * Генерирует URL для страницы согласия Google
   */
  getAuthUrl(): string {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline', // 'offline' нужен, чтобы получить refresh_token
      scope: [
        'https://www.googleapis.com/auth/calendar.events', // Полный доступ к событиям
        'https://www.googleapis.com/auth/calendar.readonly', // Чтение календарей (для проверки)
      ],
      prompt: 'consent', // Показывает экран согласия, даже если уже давали
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
        this.logger.warn('!!! REFRESH TOKEN не получен. (Возможно, разрешение уже было дано ранее?)');
        // 'tokens.access_token' все еще может быть здесь, если нам нужен только он
        // Но для CRON нам *обязательно* нужен refresh_token
        // Если вы тестируете повторно, удалите приложение из "Разрешений" в аккаунте Google
      } else {
        this.logger.log('✅ REFRESH TOKEN получен!');
        // Сохраняем в БД. Мы сохраняем только один, последний токен.
        // В реальном приложении здесь была бы привязка к userID.
        const newToken = this.tokenRepository.create({
          id: 1, // Используем статический ID, так как у нас только один токен
          refreshToken: refreshToken,
        });
        
        // Используем save для "upsert" (обновления, если id=1 существует)
        await this.tokenRepository.save(newToken);
        this.logger.log(`✅ Токен успешно сохранен в БД. ID: ${newToken.id}`);
      }

      // Устанавливаем учетные данные в oAuth2Client для немедленного использования
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
    const token = await this.getLatestToken();
    return !!token;
  }

  // --- Вспомогательные методы ---

  private async getLatestToken(): Promise<UserToken | null> {
    try {
      // Ищем токен по нашему статическому ID
      const token = await this.tokenRepository.findOne({ where: { id: 1 } });
      return token || null;
    } catch (error) {
      this.logger.error('Ошибка при поиске токена в БД', error);
      return null;
    }
  }
}

