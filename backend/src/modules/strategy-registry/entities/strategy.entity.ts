import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pools')
export class Pool {
  @PrimaryColumn()
  poolId: string;

  @Column()
  token: string;

  @Column()
  strategy: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  minDeposit: string;

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  maxCapacity: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('strategy_executions')
export class StrategyExecution {
  @PrimaryColumn()
  id: number;

  @Column()
  poolId: string;

  @Column()
  strategy: string;

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  weight: string;

  @CreateDateColumn()
  executedAt: Date;
}
