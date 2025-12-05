import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_tokens')
export class UserToken {

  @PrimaryColumn()
  id: string; // Device UUID

  @Column()
  refreshToken: string;

  // --- НОВЫЕ ПОЛЯ ---
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  picture: string;
  // ------------------

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn() 
  updatedAt: Date;
}