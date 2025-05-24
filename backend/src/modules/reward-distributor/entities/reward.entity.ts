import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  amount: string;

  @Column()
  reason: string;

  @Column({ default: false })
  claimed: boolean;

  @CreateDateColumn()
  timestamp: Date;
}

@Entity('authorized_distributors')
export class AuthorizedDistributor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;

  @Column({ default: true })
  authorized: boolean;

  @CreateDateColumn()
  timestamp: Date;
}
