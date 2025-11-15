import { Module } from '@nestjs/common';
import { ScheduleModule } from './schedule/schedule.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Schedule } from './schedule/schedule.entity';
import { Group } from './schedule/group.entity';
import { Teacher } from './schedule/teacher.entity';
import { Office } from './schedule/office.entity';
// --- НОВЫЕ ИМПОРТЫ ---
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { UserToken } from './google-calendar/user-token.entity';
// --- КОНЕЦ НОВЫХ ИМПОРТОВ ---

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        
        // --- ОБНОВЛЕНИЕ: Добавляем UserToken в entities ---
        entities: [Schedule, Group, Teacher, Office, UserToken],
        // --- КОНЕЦ ОБНОВЛЕНИЯ ---
        
        synchronize: true, 
        autoLoadEntities: true, 
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    ScheduleModule,
    // --- ОБНОВЛЕНИЕ: Добавляем новый модуль ---
    GoogleCalendarModule,
    // --- КОНЕЦ ОБНОВЛЕНИЯ ---
  ],
})
export class AppModule {}