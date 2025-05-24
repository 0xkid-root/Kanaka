import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pool_metrics')
export class PoolMetrics {
  @PrimaryColumn()
  poolId: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  tvl: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  volatility: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  yieldRate: string;

  @Column({ type: 'bigint' })
  lastUpdate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
