import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cdrs')
export class CDR {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  timestamp: Date;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'float' })
  portfolioVolatility: number;

  @Column({ type: 'float' })
  averageCorrelation: number;
}
