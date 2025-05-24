import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNotEmpty, IsString, IsEnum, IsOptional, IsArray } from 'class-validator';

export class WalletAuthDto {
  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Signature created by signing the message with the private key',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b'
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'Message that was signed',
    example: 'Sign this message to authenticate with Kanaka Protocol: nonce=123456'
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SocialAuthDto {
  @ApiProperty({
    description: 'OAuth token from social platform',
    example: 'ya29.a0AfB_byC3-DeFgHiJkLmNoPqRsTuVwXyZ'
  })
  @IsString()
  @IsNotEmpty()
  oauthToken: string;

  @ApiProperty({
    description: 'Social platform',
    enum: ['twitter', 'discord'],
    example: 'twitter'
  })
  @IsEnum(['twitter', 'discord'])
  @IsNotEmpty()
  platform: 'twitter' | 'discord';
}

export class UserProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  walletAddress: string;

  @ApiProperty({
    description: 'KNT token balance',
    example: 1000.5
  })
  kntBalance: number;

  @ApiProperty({
    description: 'Twitter ID if connected',
    example: '123456789',
    required: false
  })
  @IsOptional()
  twitterId?: string;

  @ApiProperty({
    description: 'Discord ID if connected',
    example: '123456789012345678',
    required: false
  })
  @IsOptional()
  discordId?: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2025-05-23T02:10:26+05:30'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2025-05-23T02:10:26+05:30'
  })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  accessToken: string;

  @ApiProperty({
    description: 'User profile information'
  })
  user: UserProfileResponseDto;
}

export class UpdateRolesDto {
  @ApiProperty({
    description: 'User ID',
    example: 1
  })
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'User roles',
    example: ['user', 'admin'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  roles: string[];
}
