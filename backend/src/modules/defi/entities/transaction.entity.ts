import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  userId: number = 0;

  @Column()
  poolId: number = 0;

  @Column()
  type: 'deposit' | 'withdraw' = 'deposit';

  @Column({ type: 'float' })
  amount: number = 0;

  @Column()
  transactionHash: string = '';

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed' = 'pending';

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
