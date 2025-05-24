import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('votes')
export class Vote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proposalId: number;

  @Column()
  voter: string;

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  weight: string;

  @Column()
  vote: 'yes' | 'no';

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  timestamp: Date;
}
