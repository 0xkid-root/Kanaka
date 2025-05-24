import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEthereumAddress, IsNotEmpty, IsOptional, MinLength, MaxLength, IsArray } from 'class-validator';

export class CreateProposalDto {
  @ApiProperty({
    description: 'Detailed description of the proposal',
    example: 'This proposal aims to increase the allocation to ETH staking strategies by 10%'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string = '';

  @ApiProperty({
    description: 'Title of the proposal',
    example: 'Increase ETH Staking Allocation'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  title: string = '';

  @ApiProperty({
    description: 'Actions to be executed if the proposal passes',
    example: [{
      target: '0x1234567890abcdef1234567890abcdef12345678',
      value: '0',
      signature: 'updateAllocation(uint256,uint256)',
      calldata: '0x0000000000000000000000000000000000000000000000000000000000000001,0x000000000000000000000000000000000000000000000000000000000000000a'
    }],
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        value: { type: 'string' },
        signature: { type: 'string' },
        calldata: { type: 'string' }
      }
    }
  })
  @IsOptional()
  @IsArray()
  actions?: Array<{
    target: string;
    value: string;
    signature: string;
    calldata: string;
  }>;
}

export class ProposalDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 1
  })
  @IsNumber()
  id: number = 0;

  @ApiProperty({
    description: 'Address of the proposer',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsEthereumAddress()
  proposer: string = '';

  @ApiProperty({
    description: 'Title of the proposal',
    example: 'Increase ETH Staking Allocation'
  })
  @IsString()
  title: string = '';

  @ApiProperty({
    description: 'Detailed description of the proposal',
    example: 'This proposal aims to increase the allocation to ETH staking strategies by 10%'
  })
  @IsString()
  description: string = '';

  @ApiProperty({
    description: 'Timestamp when voting starts',
    example: 1714503600
  })
  @IsNumber()
  startTime: number = 0;

  @ApiProperty({
    description: 'Timestamp when voting ends',
    example: 1715108400
  })
  @IsNumber()
  endTime: number = 0;

  @ApiProperty({
    description: 'Number of votes in favor',
    example: '1000000000000000000000'
  })
  @IsString()
  forVotes: string = '0';

  @ApiProperty({
    description: 'Number of votes against',
    example: '500000000000000000000'
  })
  @IsString()
  againstVotes: string = '0';

  @ApiProperty({
    description: 'Whether the proposal has been executed',
    example: false
  })
  @IsBoolean()
  executed: boolean = false;

  @ApiProperty({
    description: 'Whether the proposal has been canceled',
    example: false
  })
  @IsBoolean()
  canceled: boolean = false;
}

export class CastVoteDto {
  @ApiProperty({
    description: 'Whether to support the proposal',
    example: true
  })
  @IsBoolean()
  support: boolean = false;

  @ApiProperty({
    description: 'Optional reason for the vote',
    example: 'I support this proposal because it will increase yields',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string = '';
}

export class VoteResponseDto {
  @ApiProperty({
    description: 'Vote ID',
    example: 1
  })
  id: number = 0;

  @ApiProperty({
    description: 'Proposal ID',
    example: 1
  })
  proposalId: number = 0;

  @ApiProperty({
    description: 'Voter address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  voter: string = '';

  @ApiProperty({
    description: 'Whether the vote supports the proposal',
    example: true
  })
  support: boolean = false;

  @ApiProperty({
    description: 'Voting power used',
    example: '1000000000000000000'
  })
  votes: string = '0';

  @ApiProperty({
    description: 'Reason for the vote',
    example: 'I support this proposal because it will increase yields',
    nullable: true
  })
  reason: string | null = null;

  @ApiProperty({
    description: 'Timestamp of the vote',
    example: '2025-05-23T02:10:26+05:30'
  })
  timestamp: Date = new Date();
}

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
