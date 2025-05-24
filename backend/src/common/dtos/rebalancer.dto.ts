import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEthereumAddress, IsOptional, IsString } from 'class-validator';

export class RebalanceTriggerDto {
  @ApiProperty({
    description: 'Flag to indicate manual trigger',
    example: true
  })
  @IsBoolean()
  manualTrigger: boolean = false;

  @ApiProperty({
    description: 'Admin wallet address that triggered the rebalance',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false
  })
  @IsEthereumAddress()
  @IsOptional()
  adminAddress?: string = '';

  @ApiProperty({
    description: 'Reason for manual rebalance',
    example: 'Emergency rebalance due to market volatility',
    required: false
  })
  @IsString()
  @IsOptional()
  reason?: string = '';
}

export class RebalanceHistoryResponseDto {
  @ApiProperty({
    description: 'Rebalance ID',
    example: 1
  })
  id: number = 0;

  @ApiProperty({
    description: 'Timestamp of rebalance',
    example: '2025-05-23T02:10:26+05:30'
  })
  timestamp: Date = new Date();

  @ApiProperty({
    description: 'Previous portfolio weights',
    example: {
      '1': 0.3,
      '2': 0.4,
      '3': 0.3
    }
  })
  oldWeights: Record<string, number> = {};

  @ApiProperty({
    description: 'New portfolio weights',
    example: {
      '1': 0.25,
      '2': 0.5,
      '3': 0.25
    }
  })
  newWeights: Record<string, number> = {};

  @ApiProperty({
    description: 'Correlation-Driven Risk value',
    example: 1.75
  })
  cdrValue: number = 0;

  @ApiProperty({
    description: 'Whether CDR threshold was breached',
    example: true
  })
  thresholdBreached: boolean = false;

  @ApiProperty({
    description: 'Transaction hash if rebalance was executed on-chain',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    required: false
  })
  transactionHash?: string = '';

  @ApiProperty({
    description: 'Rebalance status',
    example: 'completed',
    enum: ['pending', 'completed', 'failed']
  })
  status: 'pending' | 'completed' | 'failed' = 'pending';
}

// Define the item class first to avoid the "used before declaration" error
export class PortfolioAllocationItemDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1
  })
  poolId: number = 0;

  @ApiProperty({
    description: 'Pool name',
    example: 'Starknet ETH/USDC'
  })
  poolName: string = '';

  @ApiProperty({
    description: 'Portfolio weight',
    example: 0.25
  })
  weight: number = 0;

  @ApiProperty({
    description: 'Current yield percentage',
    example: 5.75
  })
  yield: number = 0;

  @ApiProperty({
    description: 'Yield volatility',
    example: 0.82
  })
  volatility: number = 0;

  @ApiProperty({
    description: 'Pool score (yield/volatility)',
    example: 7.01
  })
  score: number = 0;
}

export class PortfolioAllocationResponseDto {
  @ApiProperty({
    description: 'List of pool allocations',
    type: [PortfolioAllocationItemDto]
  })
  allocations: PortfolioAllocationItemDto[] = [];

  @ApiProperty({
    description: 'Current CDR value',
    example: 1.75
  })
  cdrValue: number = 0;

  @ApiProperty({
    description: 'Portfolio volatility',
    example: 0.65
  })
  portfolioVolatility: number = 0;

  @ApiProperty({
    description: 'Average correlation between pools',
    example: 0.32
  })
  averageCorrelation: number = 0;
}
