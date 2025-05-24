import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class YieldHarvest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  poolId!: string;

  @Column()
  amount!: string;

  @Column()
  timestamp!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}