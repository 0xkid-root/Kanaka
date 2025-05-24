import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('votes')
export class Vote {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  proposalId: number = 0;

  @Column()
  voter: string = '';

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  weight: string = '0';

  @Column()
  vote: 'yes' | 'no' = 'yes';

  @Column({ type: 'text', nullable: true })
  reason: string = '';

  @CreateDateColumn()
  timestamp: Date = new Date();
}
