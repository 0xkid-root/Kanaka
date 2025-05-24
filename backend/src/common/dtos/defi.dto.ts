import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  userAddress: string;

  @ApiProperty({
    description: 'Amount to deposit',
    example: 100.5
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Pool address or identifier',
    example: '0xabcdef1234567890abcdef1234567890abcdef12'
  })
  @IsString()
  @IsNotEmpty()
  pool: string;
}

export class WithdrawDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  userAddress: string;

  @ApiProperty({
    description: 'Amount to withdraw',
    example: 50.25
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Pool address or identifier',
    example: '0xabcdef1234567890abcdef1234567890abcdef12'
  })
  @IsString()
  @IsNotEmpty()
  pool: string;
}

export class PoolResponseDto {
  @ApiProperty({
    description: 'Pool ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Pool name',
    example: 'Starknet ETH/USDC'
  })
  name: string;

  @ApiProperty({
    description: 'Pool contract address',
    example: '0xabcdef1234567890abcdef1234567890abcdef12'
  })
  address: string;

  @ApiProperty({
    description: 'Protocol name',
    example: 'JediSwap'
  })
  protocol: string;

  @ApiProperty({
    description: 'Current yield percentage',
    example: 5.75
  })
  currentYield: number;

  @ApiProperty({
    description: 'Yield volatility',
    example: 0.82
  })
  volatility: number;

  @ApiProperty({
    description: 'Pool score (yield/volatility)',
    example: 7.01
  })
  score: number;

  @ApiProperty({
    description: 'Current portfolio weight',
    example: 0.25
  })
  weight: number;

  @ApiProperty({
    description: 'Yield model parameters',
    example: {
      a: 4.5,
      b: 2.1,
      c: 0.03
    }
  })
  yieldModel: {
    a: number;
    b: number;
    c: number;
  };
}

export class TransactionResponseDto {
  @ApiProperty({
    description: 'Transaction hash',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'pending',
    enum: ['pending', 'completed', 'failed']
  })
  status: 'pending' | 'completed' | 'failed';
}
