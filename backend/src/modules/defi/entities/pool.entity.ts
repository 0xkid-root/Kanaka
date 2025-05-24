import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('pools')
export class Pool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  token: string;

  @Column()
  strategy: string;

  @Column({ type: 'varchar' })
  totalValue: string;

  @Column({ type: 'varchar' })
  minDeposit: string;

  @Column({ type: 'varchar' })
  maxCapacity: string;

  @Column({ type: 'float', default: 0 })
  currentYield: number;

  @Column({ type: 'float', default: 0 })
  volatility: number;

  @Column({ type: 'float', default: 0 })
  weight: number;

  @OneToMany(() => Transaction, transaction => transaction.pool)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
