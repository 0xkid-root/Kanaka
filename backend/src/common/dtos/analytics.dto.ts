import { IsArray, IsDate, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MetricDto {
  @IsNumber()
  poolId!: number;

  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsNumber()
  yield!: number;

  @IsNumber()
  volatility!: number;

  @IsNumber()
  modeledYield!: number;

  @IsNumber()
  score!: number;
}

export class UpdateMetricsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  metrics!: MetricDto[];
}

export class CorrelationDto {
  @IsNumber()
  poolIdA!: number;

  @IsNumber()
  poolIdB!: number;

  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsNumber()
  correlation!: number;
}

export class UpdateCorrelationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrelationDto)
  correlations!: CorrelationDto[];

  @IsOptional()
  @IsArray()
  matrix?: number[][];
}

export class CDRDto {
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsNumber()
  value!: number;

  @IsNumber()
  portfolioVolatility!: number;

  @IsNumber()
  averageCorrelation!: number;

  @IsOptional()
  @IsNumber()
  poolId?: number;
}

export class UpdateCDRDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CDRDto)
  cdrs!: CDRDto[];
}