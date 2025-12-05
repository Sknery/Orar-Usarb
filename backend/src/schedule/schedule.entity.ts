import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: string;

  @Column()
  time: string;

  @Column()
  subject: string;

  @Column({ name: 'lesson_type' })
  type: string;

  @Column()
  professor: string;

  @Column()
  classroom: string;

  @Column()
  group: string;

  @Column({ name: 'professor_color' })
  professorColor: string;

  // --- НОВОЕ ПОЛЕ: Автоматически обновляется при записи/изменении ---
  @UpdateDateColumn()
  updatedAt: Date;
}