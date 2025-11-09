import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('teachers')
export class Teacher {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;
} 