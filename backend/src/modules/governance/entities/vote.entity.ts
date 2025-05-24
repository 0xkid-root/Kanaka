import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Proposal } from './proposal.entity';

@Entity('votes')
export class Vote {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  proposalId: number = 0;

  @Column()
  voterId: number = 0;

  @Column()
  voterAddress: string = '';

  @Column({ type: 'decimal', precision: 36, scale: 0 })
  power: string = '0';

  @Column()
  support: 'yes' | 'no' | 'abstain' = 'yes';

  @ManyToOne(() => Proposal, proposal => proposal.votes)
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal = new Proposal();

  @CreateDateColumn()
  createdAt: Date = new Date();
}
