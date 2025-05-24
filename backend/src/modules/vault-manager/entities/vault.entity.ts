import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pool_balances')
export class PoolBalance {
  @PrimaryColumn({ type: 'varchar' })
  poolId!: string;

  @PrimaryColumn({ type: 'varchar' })
  user!: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  balance!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('pools')
export class Pool {
  @PrimaryColumn({ type: 'varchar' })
  poolId!: string;

  @Column({ type: 'varchar' })
  token!: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  totalSupply!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
