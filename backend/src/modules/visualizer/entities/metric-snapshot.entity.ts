import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('metric_snapshots')
export class MetricSnapshot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  timestamp!: Date;

  @Column('simple-json')
  metrics!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
