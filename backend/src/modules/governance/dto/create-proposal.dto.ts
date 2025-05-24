import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsArray, IsOptional } from 'class-validator';

export class CreateProposalDto {
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
    description: 'Detailed description of the proposal',
    example: 'This proposal aims to increase the allocation to ETH staking strategies by 10%'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string = '';

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

  @ApiProperty({
    description: 'Wallet address of the proposer',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string = '';
}