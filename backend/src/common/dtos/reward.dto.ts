import { IsString, IsNumber } from 'class-validator';

export class DistributeRewardDto {
  @IsString()
  user: string = '';

  @IsString()
  amount: string = '';
}

export class AuthorizeDistributorDto {
  @IsString()
  distributor: string = '';
}

export class RewardDto {
  @IsString()
  amount: string = '';

  @IsString()
  user: string = '';

  @IsNumber()
  timestamp: number = 0;
}
