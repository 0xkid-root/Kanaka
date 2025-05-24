import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column({ default: 'Untitled Proposal' })
  title: string = 'Untitled Proposal';

  @Column('text')
  description: string = '';

  @Column()
  proposer: string = '';

  @Column({ type: 'bigint' })
  startTime: number = 0;

  @Column({ type: 'bigint' })
  endTime: number = 0;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  forVotes: string = '0';

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  againstVotes: string = '0';

  @Column({ default: false })
  executed: boolean = false;

  @Column({ default: false })
  canceled: boolean = false;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  quorum: string = '0';

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
