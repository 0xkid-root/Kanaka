import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryColumn()
  hash: string;

  @Column()
  @Index()
  type: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING
  })
  @Index()
  status: TransactionStatus;

  @Column({ default: 0 })
  confirmations: number;

  @Column({ nullable: true })
  error: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  blockNumber: number;

  @Column({ nullable: true })
  gasUsed: string;

  @Column({ nullable: true })
  gasPrice: string;

  @Column({ nullable: true })
  effectiveGasPrice: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}