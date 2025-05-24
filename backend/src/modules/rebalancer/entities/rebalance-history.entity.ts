import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rebalance_history')
export class RebalanceHistory {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  timestamp: Date = new Date();

  @Column('simple-json')
  oldWeights: Record<string, number> = {};

  @Column('simple-json')
  newWeights: Record<string, number> = {};

  @Column({ type: 'float' })
  cdrValue: number = 0;

  @Column()
  thresholdBreached: boolean = false;

  @Column({ nullable: true })
  transactionHash: string = '';

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed' = 'pending';
}
