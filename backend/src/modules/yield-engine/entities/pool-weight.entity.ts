import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class PoolWeight {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  poolId!: string;

  @Column()
  weight!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}