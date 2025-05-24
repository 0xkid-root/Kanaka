import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength, IsOptional } from 'class-validator';

export class VoteDto {
  @ApiProperty({
    description: 'Vote support type',
    example: 'yes',
    enum: ['yes', 'no', 'abstain']
  })
  @IsEnum(['yes', 'no', 'abstain'])
  @IsNotEmpty()
  support: 'yes' | 'no' | 'abstain' = 'yes';

  @ApiProperty({
    description: 'Wallet address of the voter',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string = '';

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