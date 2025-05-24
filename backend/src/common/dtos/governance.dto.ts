import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProposalDto {
  @ApiProperty({
    description: 'Proposal title',
    example: 'Add support for new DeFi protocol'
  })
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiProperty({
    description: 'Detailed proposal description',
    example: 'This proposal aims to integrate XYZ protocol into Kanaka to increase yield opportunities.'
  })
  @IsString()
  @IsNotEmpty()
  description: string = '';

  @ApiProperty({
    description: 'Proposer wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  userAddress: string = '';
}

export class VoteDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 1
  })
  @IsNumber()
  @Min(1)
  proposalId: number = 0;

  @ApiProperty({
    description: 'Voter wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  userAddress: string = '';

  @ApiProperty({
    description: 'Voting weight (based on KNT balance)',
    example: 100.5
  })
  @IsNumber()
  @Min(0)
  voteWeight: number = 0;

  @ApiProperty({
    description: 'Vote choice',
    enum: ['yes', 'no'],
    example: 'yes'
  })
  @IsEnum(['yes', 'no'])
  vote: 'yes' | 'no' = 'yes';
}

export class ProposalResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 1
  })
  id: number = 0;

  @ApiProperty({
    description: 'Proposal title',
    example: 'Add support for new DeFi protocol'
  })
  title: string = '';

  @ApiProperty({
    description: 'Detailed proposal description',
    example: 'This proposal aims to integrate XYZ protocol into Kanaka to increase yield opportunities.'
  })
  description: string = '';

  @ApiProperty({
    description: 'Proposer wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  proposer: string = '';

  @ApiProperty({
    description: 'Proposal status',
    enum: ['active', 'passed', 'rejected', 'executed'],
    example: 'active'
  })
  status: 'active' | 'passed' | 'rejected' | 'executed' = 'active';

  @ApiProperty({
    description: 'Voting start time',
    example: '2025-05-23T02:10:26+05:30'
  })
  startTime: Date = new Date();

  @ApiProperty({
    description: 'Voting end time',
    example: '2025-05-30T02:10:26+05:30'
  })
  endTime: Date = new Date();

  @ApiProperty({
    description: 'Total yes votes',
    example: 1500.75
  })
  yesVotes: number = 0;

  @ApiProperty({
    description: 'Total no votes',
    example: 750.25
  })
  noVotes: number = 0;

  @ApiProperty({
    description: 'Proposal creation timestamp',
    example: '2025-05-23T02:10:26+05:30'
  })
  createdAt: Date = new Date();

  @ApiProperty({
    description: 'Proposal last update timestamp',
    example: '2025-05-23T02:10:26+05:30'
  })
  updatedAt: Date = new Date();
}

export class ProposalListResponseDto {
  @ApiProperty({
    description: 'List of proposals',
    type: [ProposalResponseDto]
  })
  proposals: ProposalResponseDto[] = [];

  @ApiProperty({
    description: 'Total number of proposals',
    example: 10
  })
  total: number = 0;
}
