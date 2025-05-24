import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'deposit' | 'withdrawal' | 'transfer'

  @Column()
  amount: number;

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column()
  status: string; // 'pending' | 'completed' | 'failed'

  @CreateDateColumn()
  createdAt: Date;
}
