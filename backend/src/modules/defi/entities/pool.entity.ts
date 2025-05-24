import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('pools')
export class Pool {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column({ unique: true })
  name: string = '';

  @Column()
  token: string = '';

  @Column()
  strategy: string = '';

  @Column({ type: 'varchar' })
  totalValue: string = '0';

  @Column({ type: 'varchar' })
  minDeposit: string = '0';

  @Column({ type: 'varchar' })
  maxCapacity: string = '0';

  @Column({ type: 'float', default: 0 })
  currentYield: number = 0;

  @Column({ type: 'float', default: 0 })
  volatility: number = 0;

  @Column({ type: 'float', default: 0 })
  weight: number = 0;

  @OneToMany(() => Transaction, (transaction: any) => transaction.poolId)
  transactions: Transaction[] = [];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
