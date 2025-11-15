import { Controller, Get, Query, Res, Logger, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import type { Response } from 'express';
// --- НОВЫЙ ИМПОРТ ---
import { ScheduleEntry } from '../schedule/schedule.dto';
// --- КОНЕЦ ИМПОРТА ---

@Controller('google-calendar')
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);

  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth-url')
  async getAuthUrl(@Res() res: Response) {
    this.logger.log('Получен запрос на /api/google-calendar/auth-url');
    try {
      const authUrl = this.googleCalendarService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Ошибка при генерации authUrl', error);
      res.status(500).send('Eroare la generarea URL-ului de autentificare');
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
      return res.redirect('http://localhost:5173?google-auth-error=true');
    }

    try {
      await this.googleCalendarService.handleOAuthCallback(code);
      this.logger.log('GET /oauth-callback - Токены успешно получены и сохранены.');
      
      res.redirect('http://localhost:5173');

    } catch (error) {
      this.logger.error(`GET /oauth-callback - Ошибка: ${error.message}`, error.stack);
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

  // ---
  // --- НОВЫЙ ENDPOINT: Синхронизация недели
  // ---
  @Post('sync-week')
  @HttpCode(HttpStatus.OK) // Отправляем 200 OK при успехе
  async syncWeek(
    @Body() body: { lessons: ScheduleEntry[], weekStartDate: string }
  ) {
    this.logger.log(`POST /sync-week - Получен запрос на синхронизацию ${body.lessons?.length ?? 0} уроков.`);
    if (!body.lessons || !body.weekStartDate) {
      this.logger.warn('POST /sync-week - Неверный запрос, отсутствуют уроки или дата.');
      return { success: false, message: 'Date invalide.' };
    }

    try {
      const result = await this.googleCalendarService.syncWeek(body.lessons, body.weekStartDate);
      return result;
    } catch (error) {
      this.logger.error(`POST /sync-week - Ошибка при синхронизации: ${error.message}`);
      // Отправляем ошибку обратно на фронтенд
      return { success: false, message: error.message };
    }
  }
}