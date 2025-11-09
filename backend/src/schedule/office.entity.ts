import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('offices')
export class Office {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;
}