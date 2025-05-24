import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryColumn()
  hash: string = '';

  @Column()
  @Index()
  type: string = '';

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING
  })
  @Index()
  status: TransactionStatus = TransactionStatus.PENDING;

  @Column({ default: 0 })
  confirmations: number = 0;

  @Column({ nullable: true })
  error: string = '';

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any> = {};

  @Column({ default: 0 })
  retryCount: number = 0;

  @Column({ nullable: true })
  blockNumber: number = 0;

  @Column({ nullable: true })
  gasUsed: string = '';

  @Column({ nullable: true })
  gasPrice: string = '';

  @Column({ nullable: true })
  effectiveGasPrice: string = '';

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}