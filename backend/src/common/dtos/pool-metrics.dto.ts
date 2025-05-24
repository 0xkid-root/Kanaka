import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePoolMetricsDto {
  @IsString()
  poolId: string = '';

  @IsString()
  amount: string = '';

  @IsNumber()
  isDeposit: boolean = false;
}

export class UpdateVolatilityDto {
  @IsString()
  poolId: string = '';

  @IsString()
  volatility: string = '';
}

export class UpdateYieldRateDto {
  @IsString()
  poolId: string = '';

  @IsString()
  yieldRate: string = '';
}

export class UpdateCorrelationDto {
  @IsString()
  poolA: string = '';

  @IsString()
  poolB: string = '';

  @IsString()
  correlation: string = '';
}

export class PoolMetricsDto {
  @IsString()
  tvl: string = '';

  @IsString()
  volatility: string = '';

  @IsString()
  yieldRate: string = '';

  @IsNumber()
  lastUpdate: number = 0;
}

export class PoolMetricsWebSocketDto {
  @ApiProperty({ description: 'Pool identifier' })
  @IsString()
  poolId: string = '';

  @ApiProperty({ description: 'Total value locked in the pool' })
  @IsNumber()
  totalValueLocked: number = 0;

  @ApiProperty({ description: 'Current APY of the pool' })
  @IsNumber()
  apy: number = 0;

  @ApiProperty({ description: '24-hour trading volume' })
  @IsNumber()
  volume24h: number = 0;

  @ApiProperty({ description: 'Number of unique users' })
  @IsNumber()
  userCount: number = 0;

  @ApiProperty({ description: 'Pool utilization rate', required: false })
  @IsNumber()
  @IsOptional()
  utilizationRate?: number = 0;

  @ApiProperty({ description: 'Available liquidity', required: false })
  @IsNumber()
  @IsOptional()
  liquidity?: number = 0;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDate()
  lastUpdated: Date = new Date();
}
