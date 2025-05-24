import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pool_metrics')
export class PoolMetrics {
  @PrimaryColumn()
  poolId: string = '';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  tvl: string = '0';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  volatility: string = '0';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  yieldRate: string = '0';

  @Column({ type: 'bigint' })
  lastUpdate: number = 0;

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
