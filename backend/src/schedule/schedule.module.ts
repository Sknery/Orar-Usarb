import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { Schedule } from './schedule.entity';
import { HttpModule } from '@nestjs/axios';

// --- ИЗМЕНЕНИЕ: Импортируем новые сущности ---
import { Group } from './group.entity';
import { Teacher } from './teacher.entity';
import { Office } from './office.entity';
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

@Module({
  imports: [
    HttpModule,
    // --- ИЗМЕНЕНИЕ: Добавляем их в 'forFeature' ---
    TypeOrmModule.forFeature([Schedule, Group, Teacher, Office]),
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}