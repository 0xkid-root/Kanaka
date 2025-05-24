import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class ProposalUpdateDto {
  @ApiProperty({ description: 'Proposal identifier' })
  @IsString()
  @IsNotEmpty()
  proposalId: string = '';

  @ApiProperty({ description: 'Proposal title' })
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiProperty({ description: 'Current status' })
  @IsString()
  status: 'pending' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled' = 'pending';

  @ApiProperty({ description: 'Total votes in favor' })
  @IsNumber()
  votesFor: number = 0;

  @ApiProperty({ description: 'Total votes against' })
  @IsNumber()
  votesAgainst: number = 0;

  @ApiProperty({ description: 'Total abstained votes' })
  @IsNumber()
  votesAbstain: number = 0;

  @ApiProperty({ description: 'Quorum percentage reached' })
  @IsNumber()
  quorumPercentage: number = 0;

  @ApiProperty({ description: 'Time remaining for voting (in seconds)' })
  @IsNumber()
  @IsOptional()
  timeRemaining?: number = 0;

  @ApiProperty({ description: 'Execution status if passed' })
  @IsString()
  @IsOptional()
  executionStatus?: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending';

  @ApiProperty({ description: 'Last update timestamp' })
  lastUpdated: Date = new Date();

  @ApiProperty({ description: 'Recent votes' })
  @IsArray()
  @IsOptional()
  recentVotes?: Array<{
    voter: string;
    support: 'for' | 'against' | 'abstain';
    weight: number;
    timestamp: Date;
  }> = [];
}