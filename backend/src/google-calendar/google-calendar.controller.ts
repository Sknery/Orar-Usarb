import { Controller, Get, Query, Res, Logger, Post, Body, HttpCode, HttpStatus, Delete } from '@nestjs/common'; // Добавлен Delete
import { GoogleCalendarService } from './google-calendar.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ScheduleEntry } from '../schedule/schedule.dto';

@Controller('google-calendar')
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  @Get('auth-url')
  async getAuthUrl(
    @Query('userId') userId: string,
    @Res() res: Response
  ) {
    if (!userId) {
       return res.status(400).send('User ID este necesar');
    }
    try {
      const authUrl = this.googleCalendarService.getAuthUrl(userId);
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Ошибка при генерации authUrl', error);
      res.status(500).send('Eroare server');
    }
  }

  @Get('oauth-callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string, 
    @Res() res: Response,
  ) {
    if (!code) return res.redirect(`${this.frontendUrl}?google-auth-error=no-code`);
    if (!state) return res.redirect(`${this.frontendUrl}?google-auth-error=no-state`);

    const userId = state; 

    try {
      await this.googleCalendarService.handleOAuthCallback(code, userId);
      res.redirect(this.frontendUrl);
    } catch (error: any) {
      this.logger.error(`Ошибка OAuth: ${error.message}`);
      res.redirect(`${this.frontendUrl}?google-auth-error=true`);
    }
  }

  @Get('check-status')
  async checkStatus(@Query('userId') userId: string) {
    if (!userId) return { isConnected: false };
    // Теперь возвращает также email и имя
    return await this.googleCalendarService.getConnectionStatus(userId);
  }

  // --- НОВЫЙ МЕТОД: Отключение ---
  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Body() body: { userId: string }) {
      if (!body.userId) return { success: false };
      await this.googleCalendarService.disconnectUser(body.userId);
      return { success: true };
  }
  // --------------------------------

  @Post('sync-week')
  @HttpCode(HttpStatus.OK)
  async syncWeek(
    @Body() body: { lessons: ScheduleEntry[], weekStartDate: string, userId: string }
  ) {
    if (!body.lessons || !body.weekStartDate || !body.userId) {
      return { success: false, message: 'Date incomplete.' };
    }

    try {
      const result = await this.googleCalendarService.syncWeek(body.lessons, body.weekStartDate, body.userId);
      return result;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Post('unsync-week')
  @HttpCode(HttpStatus.OK)
  async unsyncWeek(
    @Body() body: { weekStartDate: string, userId: string }
  ) {
    if (!body.weekStartDate || !body.userId) {
      return { success: false, message: 'Date incomplete.' };
    }

    try {
      const result = await this.googleCalendarService.unsyncWeek(body.weekStartDate, body.userId);
      return result;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}