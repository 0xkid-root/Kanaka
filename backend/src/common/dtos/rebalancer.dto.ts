import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEthereumAddress, IsOptional, IsString } from 'class-validator';

export class RebalanceTriggerDto {
  @ApiProperty({
    description: 'Flag to indicate manual trigger',
    example: true
  })
  @IsBoolean()
  manualTrigger: boolean;

  @ApiProperty({
    description: 'Admin wallet address that triggered the rebalance',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false
  })
  @IsEthereumAddress()
  @IsOptional()
  adminAddress?: string;

  @ApiProperty({
    description: 'Reason for manual rebalance',
    example: 'Emergency rebalance due to market volatility',
    required: false
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RebalanceHistoryResponseDto {
  @ApiProperty({
    description: 'Rebalance ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Timestamp of rebalance',
    example: '2025-05-23T02:10:26+05:30'
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Previous portfolio weights',
    example: {
      '1': 0.3,
      '2': 0.4,
      '3': 0.3
    }
  })
  oldWeights: Record<string, number>;

  @ApiProperty({
    description: 'New portfolio weights',
    example: {
      '1': 0.25,
      '2': 0.5,
      '3': 0.25
    }
  })
  newWeights: Record<string, number>;

  @ApiProperty({
    description: 'Correlation-Driven Risk value',
    example: 1.75
  })
  cdrValue: number;

  @ApiProperty({
    description: 'Whether CDR threshold was breached',
    example: true
  })
  thresholdBreached: boolean;

  @ApiProperty({
    description: 'Transaction hash if rebalance was executed on-chain',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    required: false
  })
  transactionHash?: string;

  @ApiProperty({
    description: 'Rebalance status',
    example: 'completed',
    enum: ['pending', 'completed', 'failed']
  })
  status: 'pending' | 'completed' | 'failed';
}

export class PortfolioAllocationResponseDto {
  @ApiProperty({
    description: 'List of pool allocations',
    type: [PortfolioAllocationItemDto]
  })
  allocations: PortfolioAllocationItemDto[];

  @ApiProperty({
    description: 'Current CDR value',
    example: 1.75
  })
  cdrValue: number;

  @ApiProperty({
    description: 'Portfolio volatility',
    example: 0.65
  })
  portfolioVolatility: number;

  @ApiProperty({
    description: 'Average correlation between pools',
    example: 0.32
  })
  averageCorrelation: number;
}

export class PortfolioAllocationItemDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1
  })
  poolId: number;

  @ApiProperty({
    description: 'Pool name',
    example: 'Starknet ETH/USDC'
  })
  poolName: string;

  @ApiProperty({
    description: 'Portfolio weight',
    example: 0.25
  })
  weight: number;

  @ApiProperty({
    description: 'Current yield percentage',
    example: 5.75
  })
  yield: number;

  @ApiProperty({
    description: 'Yield volatility',
    example: 0.82
  })
  volatility: number;

  @ApiProperty({
    description: 'Pool score (yield/volatility)',
    example: 7.01
  })
  score: number;
}
