import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePoolMetricsDto {
  @IsString()
  poolId: string;

  @IsString()
  amount: string;

  @IsNumber()
  isDeposit: boolean;
}

export class UpdateVolatilityDto {
  @IsString()
  poolId: string;

  @IsString()
  volatility: string;
}

export class UpdateYieldRateDto {
  @IsString()
  poolId: string;

  @IsString()
  yieldRate: string;
}

export class UpdateCorrelationDto {
  @IsString()
  poolA: string;

  @IsString()
  poolB: string;

  @IsString()
  correlation: string;
}

export class PoolMetricsDto {
  @IsString()
  tvl: string;

  @IsString()
  volatility: string;

  @IsString()
  yieldRate: string;

  @IsNumber()
  lastUpdate: number;
}

export class PoolMetricsWebSocketDto {
  @ApiProperty({ description: 'Pool identifier' })
  @IsString()
  poolId: string;

  @ApiProperty({ description: 'Total value locked in the pool' })
  @IsNumber()
  totalValueLocked: number;

  @ApiProperty({ description: 'Current APY of the pool' })
  @IsNumber()
  apy: number;

  @ApiProperty({ description: '24-hour trading volume' })
  @IsNumber()
  volume24h: number;

  @ApiProperty({ description: 'Number of unique users' })
  @IsNumber()
  userCount: number;

  @ApiProperty({ description: 'Pool utilization rate', required: false })
  @IsNumber()
  @IsOptional()
  utilizationRate?: number;

  @ApiProperty({ description: 'Available liquidity', required: false })
  @IsNumber()
  @IsOptional()
  liquidity?: number;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDate()
  lastUpdated: Date;
}
