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
  id: number = 0;

  @Column({ unique: true })
  walletAddress: string = '';

  @Column({ 
    type: 'enum', 
    enum: WalletType, 
    default: WalletType.ETHEREUM 
  })
  walletType: WalletType = WalletType.ETHEREUM;

  @Column({ default: '' })
  nonce: string = '';

  @Column({ type: 'float', default: 0 })
  kntBalance: number = 0;

  @Column({ nullable: true })
  twitterId?: string;

  @Column({ nullable: true })
  discordId?: string;

  @Column({
    type: 'simple-array',
    default: UserRole.USER,
  })
  roles: string[] = [UserRole.USER];

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
