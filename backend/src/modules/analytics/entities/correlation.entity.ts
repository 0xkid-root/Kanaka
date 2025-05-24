import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('correlations')
export class Correlation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  poolIdA: number;

  @Column()
  poolIdB: number;

  @Column()
  timestamp: Date;

  @Column({ type: 'float' })
  correlation: number;
}
