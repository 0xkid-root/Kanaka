import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  user: string = '';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  amount: string = '0';

  @Column()
  reason: string = '';

  @Column({ default: false })
  claimed: boolean = false;

  @CreateDateColumn()
  timestamp: Date = new Date();
}

@Entity('authorized_distributors')
export class AuthorizedDistributor {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  address: string = '';

  @Column({ default: true })
  authorized: boolean = true;

  @CreateDateColumn()
  timestamp: Date = new Date();
}
