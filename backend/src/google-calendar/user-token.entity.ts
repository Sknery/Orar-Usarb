import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_tokens')
export class UserToken {

  /**
   * Мы используем PrimaryColumn (а не PrimaryGeneratedColumn),
   * потому что мы вручную устанавливаем ID = 1
   */
  @PrimaryColumn()
  id: number;

  @Column()
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

