import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class YieldCurveParamsDto {
  @ApiProperty({
    description: 'Asymptotic long-term yield',
    example: 4.5
  })
  @IsNumber()
  a: number;

  @ApiProperty({
    description: 'Initial deviation',
    example: 2.1
  })
  @IsNumber()
  b: number;

  @ApiProperty({
    description: 'Rate of decay',
    example: 0.03
  })
  @IsNumber()
  c: number;
}

export class YieldCurveDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1
  })
  @IsNumber()
  poolId: number;

  @ApiProperty({
    description: 'Pool name',
    example: 'Starknet ETH/USDC'
  })
  @IsString()
  poolName: string;

  @ApiProperty({
    description: 'Time points for the yield curve (in days)',
    example: [1, 7, 30, 90, 180, 365]
  })
  @IsArray()
  timePoints: number[];

  @ApiProperty({
    description: 'Yield points corresponding to time points',
    example: [6.2, 5.8, 5.4, 5.1, 4.9, 4.7]
  })
  @IsArray()
  yieldPoints: number[];

  @ApiProperty({
    description: 'Yield curve model parameters',
    type: YieldCurveParamsDto
  })
  @ValidateNested()
  @Type(() => YieldCurveParamsDto)
  modelParams: YieldCurveParamsDto;
}

export class PoolMetricsDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Pool name',
    example: 'Starknet ETH/USDC'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Current yield percentage',
    example: 5.75
  })
  @IsNumber()
  currentYield: number;

  @ApiProperty({
    description: 'Modeled yield based on curve fitting',
    example: 5.68
  })
  @IsNumber()
  modeledYield: number;

  @ApiProperty({
    description: 'Yield volatility',
    example: 0.82
  })
  @IsNumber()
  volatility: number;

  @ApiProperty({
    description: 'Pool score (yield/volatility)',
    example: 7.01
  })
  @IsNumber()
  score: number;

  @ApiProperty({
    description: 'Current portfolio weight',
    example: 0.25
  })
  @IsNumber()
  weight: number;
}

export class CorrelationMatrixDto {
  @ApiProperty({
    description: 'Pool IDs in the correlation matrix',
    example: [1, 2, 3]
  })
  @IsArray()
  poolIds: number[];

  @ApiProperty({
    description: 'Pool names in the correlation matrix',
    example: ['Starknet ETH/USDC', 'Starknet ETH/DAI', 'Starknet USDC/DAI']
  })
  @IsArray()
  poolNames: string[];

  @ApiProperty({
    description: 'Correlation matrix as 2D array',
    example: [
      [1.0, 0.7, 0.3],
      [0.7, 1.0, 0.5],
      [0.3, 0.5, 1.0]
    ]
  })
  @IsArray()
  correlations: number[][];
}

export class AllocationChartDto {
  @ApiProperty({
    description: 'Pool IDs in the allocation chart',
    example: [1, 2, 3]
  })
  @IsArray()
  poolIds: number[];

  @ApiProperty({
    description: 'Pool names in the allocation chart',
    example: ['Starknet ETH/USDC', 'Starknet ETH/DAI', 'Starknet USDC/DAI']
  })
  @IsArray()
  poolNames: string[];

  @ApiProperty({
    description: 'Portfolio weights',
    example: [0.25, 0.5, 0.25]
  })
  @IsArray()
  weights: number[];

  @ApiProperty({
    description: 'Colors for chart visualization',
    example: ['#FF5733', '#33FF57', '#3357FF']
  })
  @IsArray()
  colors: string[];
}

export class MetricsResponseDto {
  @ApiProperty({
    description: 'Timestamp of metrics',
    example: '2025-05-23T02:10:26+05:30'
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Correlation-Driven Risk value',
    example: 1.75
  })
  @IsNumber()
  cdr: number;

  @ApiProperty({
    description: 'Portfolio volatility',
    example: 0.65
  })
  @IsNumber()
  portfolioVolatility: number;

  @ApiProperty({
    description: 'Average correlation between pools',
    example: 0.32
  })
  @IsNumber()
  averageCorrelation: number;

  @ApiProperty({
    description: 'Pool metrics',
    type: [PoolMetricsDto]
  })
  @ValidateNested({ each: true })
  @Type(() => PoolMetricsDto)
  pools: PoolMetricsDto[];

  @ApiProperty({
    description: 'Yield curves for each pool',
    type: [YieldCurveDto]
  })
  @ValidateNested({ each: true })
  @Type(() => YieldCurveDto)
  yieldCurves: YieldCurveDto[];

  @ApiProperty({
    description: 'Correlation matrix between pools',
    type: CorrelationMatrixDto
  })
  @ValidateNested()
  @Type(() => CorrelationMatrixDto)
  correlationMatrix: CorrelationMatrixDto;

  @ApiProperty({
    description: 'Allocation chart data',
    type: AllocationChartDto
  })
  @ValidateNested()
  @Type(() => AllocationChartDto)
  allocationChart: AllocationChartDto;
}
