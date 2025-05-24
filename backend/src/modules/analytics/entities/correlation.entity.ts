import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('correlations')
export class Correlation {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  poolIdA: number = 0;

  @Column()
  poolIdB: number = 0;

  @Column()
  timestamp: Date = new Date();

  @Column({ type: 'float' })
  correlation: number = 0;
}
