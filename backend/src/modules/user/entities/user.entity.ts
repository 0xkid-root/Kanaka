import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  ORACLE = 'oracle',
  DISTRIBUTOR = 'distributor',
  GOVERNANCE = 'governance',
}

export enum WalletType {
  ETHEREUM = 'ethereum',
  STARKNET = 'starknet',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ 
    type: 'enum', 
    enum: WalletType, 
    default: WalletType.ETHEREUM 
  })
  walletType: WalletType;

  @Column()
  nonce: string;

  @Column({ type: 'float', default: 0 })
  kntBalance: number;

  @Column({ nullable: true })
  twitterId: string;

  @Column({ nullable: true })
  discordId: string;

  @Column({
    type: 'simple-array',
    default: UserRole.USER,
  })
  roles: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
