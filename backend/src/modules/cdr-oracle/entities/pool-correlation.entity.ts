import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pool_correlations')
export class PoolCorrelation {
  @PrimaryColumn()
  poolA: string;

  @PrimaryColumn()
  poolB: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  correlation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
