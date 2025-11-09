import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
// --- ИЗМЕНЕНИЕ: Импортируем 'Response' как тип ---
import type { Response } from 'express';

@Controller('google-calendar')
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);

  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth-url')
  async getAuthUrl(@Res() res: Response) {
    this.logger.log('Получен запрос на /api/google-calendar/auth-url');
    try {
      const authUrl = this.googleCalendarService.getAuthUrl();
      // Отправляем редирект на страницу Google
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Ошибка при генерации authUrl', error);
      res.status(500).send('Ошибка при генерации URL аутентификации');
    }
  }

  @Get('oauth-callback')
  async oauthCallback(
    @Query('code') code: string,
    @Res() res: Response, // Используем @Res()
  ) {
    this.logger.log(`GET /oauth-callback - получен код: ${code ? '...' : 'НЕТ КОДА'}`);
    if (!code) {
      this.logger.warn('GET /oauth-callback - Код не предоставлен в запросе');
      // --- ИСПРАВЛЕНИЕ: Используем localhost ---
      return res.redirect('http://localhost:5173?google-auth-error=true');
    }

    try {
      // Обмениваем код на токены и сохраняем refresh_token
      await this.googleCalendarService.handleOAuthCallback(code);
      this.logger.log('GET /oauth-callback - Токены успешно получены и сохранены.');
      
      // --- ИСПРАВЛЕНИЕ: Используем localhost ---
      // ВАЖНО: Мы больше не показываем "Autentificare cu succes!",
      // а просто перенаправляем пользователя обратно в приложение.
      res.redirect('http://localhost:5173');

    } catch (error) {
      this.logger.error(`GET /oauth-callback - Ошибка: ${error.message}`, error.stack);
      // --- ИСПРАВЛЕНИЕ: Используем localhost ---
      res.redirect('http://localhost:5173?google-auth-error=true');
    }
  }

  /**
   * Проверяет, есть ли у нас в БД валидный токен.
   */
  @Get('check-status')
  async checkStatus() {
    this.logger.log('GET /check-status - Проверка статуса подключения...');
    const isConnected = await this.googleCalendarService.checkConnectionStatus();
    this.logger.log(`GET /check-status - Статус: ${isConnected}`);
    return { isConnected };
  }
}

