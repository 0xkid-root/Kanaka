import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsNotEmpty, IsEthereumAddress, IsOptional, IsPositive, Min } from 'class-validator';

export class AddPoolDto {
  @ApiProperty({
    description: 'Token contract address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsString()
  @IsEthereumAddress()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Strategy contract address',
    example: '0xabcdef1234567890abcdef1234567890abcdef12'
  })
  @IsString()
  @IsEthereumAddress()
  @IsNotEmpty()
  strategy: string;

  @ApiProperty({
    description: 'Minimum deposit amount (in wei)',
    example: '100000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  minDeposit: string;

  @ApiProperty({
    description: 'Maximum capacity of the pool (in wei)',
    example: '1000000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  maxCapacity: string;
}

export class UpdatePoolDto {
  @ApiProperty({
    description: 'Pool ID to update',
    example: 'pool-1'
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;

  @ApiProperty({
    description: 'Whether the pool is active',
    example: true
  })
  @IsBoolean()
  active: boolean;

  @ApiProperty({
    description: 'Minimum deposit amount (in wei)',
    example: '100000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  minDeposit: string;

  @ApiProperty({
    description: 'Maximum capacity of the pool (in wei)',
    example: '1000000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  maxCapacity: string;
}

export class PoolDto {
  @ApiProperty({
    description: 'Pool ID',
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

  @ApiProperty({
    description: 'Strategy contract address',
    example: '0xabcdef1234567890abcdef1234567890abcdef12'
  })
  @IsString()
  @IsEthereumAddress()
  @IsNotEmpty()
  strategy: string;

  @ApiProperty({
    description: 'Whether the pool is active',
    example: true
  })
  @IsBoolean()
  active: boolean;

  @ApiProperty({
    description: 'Minimum deposit amount (in wei)',
    example: '100000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  minDeposit: string;

  @ApiProperty({
    description: 'Maximum capacity of the pool (in wei)',
    example: '1000000000000000000000'
  })
  @IsString()
  @IsNotEmpty()
  maxCapacity: string;
}

export class StrategyExecutionDto {
  @ApiProperty({
    description: 'Execution ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Pool ID',
    example: 'pool-1'
  })
  poolId: string;

  @ApiProperty({
    description: 'Timestamp of execution',
    example: '2025-05-23T02:10:26+05:30'
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  })
  txHash: string;

  @ApiProperty({
    description: 'Performance metrics',
    example: {
      apy: 5.2,
      yield: '1000000000000000000',
      fees: '10000000000000000'
    }
  })
  metrics: any;
}

export class RebalanceWeightsDto {
  @ApiProperty({
    description: 'New weights for pools',
    example: ['1000', '2000', '3000'],
    type: [String]
  })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  weights: string[];
}

export class StrategyUpdateDto {
  @ApiProperty({ description: 'Strategy identifier' })
  @IsString()
  @IsNotEmpty()
  strategyId: string;

  @ApiProperty({ description: 'Current TVL in strategy' })
  @IsNumber()
  @IsPositive()
  tvl: number;

  @ApiProperty({ description: 'Current APY' })
  @IsNumber()
  apy: number;

  @ApiProperty({ description: 'Risk score (0-100)' })
  @IsNumber()
  @Min(0)
  riskScore: number;

  @ApiProperty({ description: 'Strategy status' })
  @IsString()
  status: 'active' | 'paused' | 'deprecated';

  @ApiProperty({ description: 'Gas efficiency score' })
  @IsNumber()
  @IsOptional()
  gasEfficiency?: number;

  @ApiProperty({ description: 'Current allocation percentage' })
  @IsNumber()
  allocationPercentage: number;

  @ApiProperty({ description: 'Performance metrics' })
  performanceMetrics: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };

  @ApiProperty({ description: 'Last update timestamp' })
  lastUpdated: Date;
}
