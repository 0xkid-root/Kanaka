import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pool_correlations')
export class PoolCorrelation {
  @PrimaryColumn()
  poolA: string = '';

  @PrimaryColumn()
  poolB: string = '';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  correlation: string = '0';

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
