import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, IsEthereumAddress, Min, IsPositive } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    description: 'Pool ID to deposit into',
    example: 'pool-1'
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;

  @ApiProperty({
    description: 'Amount to deposit (in wei)',
    example: '1000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  amount: string;
}

export class WithdrawDto {
  @ApiProperty({
    description: 'Pool ID to withdraw from',
    example: 'pool-1'
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;

  @ApiProperty({
    description: 'Amount to withdraw (in wei)',
    example: '1000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  amount: string;
}

export class AddPoolDto {
  @ApiProperty({
    description: 'Unique identifier for the pool',
    example: 'pool-1'
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;

  @ApiProperty({
    description: 'Token contract address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsString()
  @IsEthereumAddress()
  @IsNotEmpty()
  token: string;
}

export class PoolBalanceDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 'pool-1'
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;

  @ApiProperty({
    description: 'User balance in the pool',
    example: '1000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  balance: string;

  @ApiProperty({
    description: 'Total supply of the pool',
    example: '10000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  totalSupply: string;

  @ApiProperty({
    description: 'Token contract address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsString()
  @IsEthereumAddress()
  @IsNotEmpty()
  token: string;
}

export class PoolResponseDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 'pool-1'
  })
  poolId: string;

  @ApiProperty({
    description: 'Token contract address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  token: string;

  @ApiProperty({
    description: 'Total supply of the pool',
    example: '10000000000000000000'
  })
  totalSupply: string;

  @ApiProperty({
    description: 'Current APY of the pool',
    example: '5.2'
  })
  apy: number;

  @ApiProperty({
    description: 'Whether the pool is active',
    example: true
  })
  active: boolean;
}

export class VaultPerformanceDto {
  @ApiProperty({ description: 'Vault identifier' })
  @IsString()
  @IsNotEmpty()
  vaultId: string;

  @ApiProperty({ description: 'Total value locked in the vault' })
  @IsNumber()
  @IsPositive()
  tvl: number;

  @ApiProperty({ description: 'Current APY' })
  @IsNumber()
  apy: number;

  @ApiProperty({ description: 'Daily yield' })
  @IsNumber()
  dailyYield: number;

  @ApiProperty({ description: 'Weekly yield' })
  @IsNumber()
  weeklyYield: number;

  @ApiProperty({ description: 'Monthly yield' })
  @IsNumber()
  monthlyYield: number;

  @ApiProperty({ description: 'Total fees generated' })
  @IsNumber()
  @IsPositive()
  totalFees: number;

  @ApiProperty({ description: 'Current strategy allocation' })
  @IsString()
  currentStrategy: string;

  @ApiProperty({ description: 'Performance score (0-100)' })
  @IsNumber()
  @Min(0)
  performanceScore: number;

  @ApiProperty({ description: 'Last rebalance timestamp' })
  lastRebalanced: Date;
}
