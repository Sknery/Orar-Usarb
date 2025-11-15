import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // --- ИЗМЕНЕНИЕ: Импортируем ConfigModule
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { UserToken } from './user-token.entity';

@Module({
  imports: [
    ConfigModule, // --- ИЗМЕНЕНИЕ: Добавляем ConfigModule (для доступа к .env)
    TypeOrmModule.forFeature([UserToken]), // --- ИЗМЕНЕНИЕ: Добавляем TypeOrm (для доступа к Repository)
  ],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
})
export class GoogleCalendarModule {}