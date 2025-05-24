import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('metrics')
export class Metric {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  poolId: number = 0;

  @Column()
  timestamp: Date = new Date();

  @Column({ type: 'float' })
  yield: number = 0;

  @Column({ type: 'float' })
  volatility: number = 0;

  @Column({ type: 'float' })
  modeledYield: number = 0;

  @Column({ type: 'float' })
  score: number = 0;
}
