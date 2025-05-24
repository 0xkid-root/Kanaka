import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('metrics')
export class Metric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  poolId: number;

  @Column()
  timestamp: Date;

  @Column({ type: 'float' })
  yield: number;

  @Column({ type: 'float' })
  volatility: number;

  @Column({ type: 'float' })
  modeledYield: number;

  @Column({ type: 'float' })
  score: number;
}
