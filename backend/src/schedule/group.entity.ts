import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('groups')
export class Group {
  /**
   * Мы используем @PrimaryColumn() вместо @PrimaryGeneratedColumn(),
   * потому что ID (например, "611") приходит из внешнего API.
   */
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;
} 