import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  userId: number = 0;

  @Column({ type: 'float' })
  amount: number = 0;

  @Column()
  reason: 'governance' | 'forum' | 'referral' = 'forum';

  @Column({ nullable: true })
  transactionHash: string = '';

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed' = 'pending';

  @CreateDateColumn()
  createdAt: Date = new Date();
}
