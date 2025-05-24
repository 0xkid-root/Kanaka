import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pools')
export class Pool {
  @PrimaryColumn()
  poolId: string = '';

  @Column()
  token: string = '';

  @Column()
  strategy: string = '';

  @Column({ default: true })
  active: boolean = true;

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  minDeposit: string = '0';

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  maxCapacity: string = '0';

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}

@Entity('strategy_executions')
export class StrategyExecution {
  @PrimaryColumn()
  id: number = 0;

  @Column()
  poolId: string = '';

  @Column()
  strategy: string = '';

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  weight: string = '0';

  @CreateDateColumn()
  executedAt: Date = new Date();
}
