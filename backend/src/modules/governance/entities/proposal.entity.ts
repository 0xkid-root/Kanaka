import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Untitled Proposal' })
  title: string;

  @Column('text')
  description: string;

  @Column()
  proposer: string;

  @Column({ type: 'bigint' })
  startTime: number;

  @Column({ type: 'bigint' })
  endTime: number;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  forVotes: string;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  againstVotes: string;

  @Column({ default: false })
  executed: boolean;

  @Column({ default: false })
  canceled: boolean;

  @Column({ type: 'decimal', precision: 36, scale: 0, default: '0' })
  quorum: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
