import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Vote } from './vote.entity';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column({ default: 'Untitled Proposal' })
  title: string = 'Untitled Proposal';

  @Column('text')
  description: string = '';

  @Column()
  creatorId: number = 0;

  @Column()
  creatorAddress: string = '';

  @Column('text')
  actions: string = '[]';

  @Column({ type: 'timestamp' })
  startTime: Date = new Date();

  @Column({ type: 'timestamp' })
  endTime: Date = new Date();

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  yesVotes: string = '0';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  noVotes: string = '0';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  abstainVotes: string = '0';

  @Column({ default: 'active' })
  status: string = 'active';

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null = null;

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[] = [];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
