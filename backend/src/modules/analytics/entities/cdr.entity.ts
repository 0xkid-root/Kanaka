import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cdrs')
export class CDR {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  timestamp: Date = new Date();

  @Column({ type: 'float' })
  value: number = 0;

  @Column({ type: 'float' })
  portfolioVolatility: number = 0;

  @Column({ type: 'float' })
  averageCorrelation: number = 0;
}
