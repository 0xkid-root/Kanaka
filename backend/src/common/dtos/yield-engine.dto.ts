import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class RebalanceDto {
  @ApiProperty({
    description: 'New weights for pools',
    example: ['1000', '2000', '3000'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  newWeights: string[] = [];
}

export class HarvestYieldDto {
  @ApiProperty({
    description: 'Pool ID to harvest yield from',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  poolId: number = 0;
}

export class PoolDepositDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  poolId: number = 0;

  @ApiProperty({
    description: 'Amount to deposit',
    example: '1000000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  amount: string = '';
}

export class PoolWithdrawalDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  poolId: number = 0;

  @ApiProperty({
    description: 'Amount to withdraw',
    example: '1000000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  amount: string = '';
}