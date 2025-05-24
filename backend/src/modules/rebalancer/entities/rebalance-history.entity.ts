import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('rebalance_history')
export class RebalanceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  timestamp: Date;

  @Column('simple-json')
  oldWeights: Record<string, number>;

  @Column('simple-json')
  newWeights: Record<string, number>;

  @Column({ type: 'float' })
  cdrValue: number;

  @Column()
  thresholdBreached: boolean;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed';
}
