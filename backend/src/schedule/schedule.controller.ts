import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleResponseDto } from './schedule.dto'; // Импортируем тип ответа

@Controller('schedule')
export class ScheduleController {
  private readonly logger = new Logger(ScheduleController.name); // Логгер

  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  // Явно указываем тип возвращаемого значения
  // Принимаем startDateOfWeek из query
  getSchedule(@Query() query: {
      group?: string;
      teacher?: string;
      office?: string;
      week?: string;
      sem?: string;
      startDateOfWeek?: string; // Новый параметр
  }): Promise<ScheduleResponseDto> {
    this.logger.log(`Received GET /schedule request with query: ${JSON.stringify(query)}`);
    // Передаем весь query в сервис
    return this.scheduleService.getSchedule(query);
  }
}

