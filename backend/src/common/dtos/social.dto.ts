import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class SocialPostDto {
  @ApiProperty({
    description: 'Social media platform',
    enum: ['twitter', 'discord'],
    example: 'twitter'
  })
  @IsEnum(['twitter', 'discord'])
  platform: 'twitter' | 'discord' = 'twitter';

  @ApiProperty({
    description: 'Message content to post',
    example: 'Kanaka Protocol just completed a rebalance with a 5.8% increase in yield!'
  })
  @IsString()
  @IsNotEmpty()
  message: string = '';

  @ApiProperty({
    description: 'Optional URL to an image to include with the post',
    example: 'https://kanaka.io/images/rebalance-chart.png',
    required: false
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string = '';
}

export class ForumPostDto {
  @ApiProperty({
    description: 'User ID',
    example: 1
  })
  @IsNumber()
  @Min(1)
  userId: number = 0;

  @ApiProperty({
    description: 'Post title',
    example: 'Thoughts on the latest rebalance strategy'
  })
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiProperty({
    description: 'Post content',
    example: 'I think the current rebalance strategy is working well, but we could improve by...'
  })
  @IsString()
  @IsNotEmpty()
  content: string = '';
}

export class ForumCommentDto {
  @ApiProperty({
    description: 'Post ID',
    example: 1
  })
  @IsNumber()
  @Min(1)
  postId: number = 0;

  @ApiProperty({
    description: 'User ID',
    example: 2
  })
  @IsNumber()
  @Min(1)
  userId: number = 0;

  @ApiProperty({
    description: 'Comment content',
    example: 'I agree with your points about the rebalance strategy.'
  })
  @IsString()
  @IsNotEmpty()
  content: string = '';
}

export class ForumPostResponseDto {
  @ApiProperty({
    description: 'Post ID',
    example: 1
  })
  id: number = 0;

  @ApiProperty({
    description: 'User ID',
    example: 1
  })
  userId: number = 0;

  @ApiProperty({
    description: 'Post title',
    example: 'Thoughts on the latest rebalance strategy'
  })
  title: string = '';

  @ApiProperty({
    description: 'Post content',
    example: 'I think the current rebalance strategy is working well, but we could improve by...'
  })
  content: string = '';

  @ApiProperty({
    description: 'IPFS hash where the content is stored',
    example: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
  })
  ipfsHash: string = '';

  @ApiProperty({
    description: 'Number of upvotes',
    example: 15
  })
  upvotes: number = 0;

  @ApiProperty({
    description: 'Number of downvotes',
    example: 3
  })
  downvotes: number = 0;

  @ApiProperty({
    description: 'Post creation timestamp',
    example: '2025-05-23T02:10:26+05:30'
  })
  createdAt: Date = new Date();

  @ApiProperty({
    description: 'Post last update timestamp',
    example: '2025-05-23T02:10:26+05:30'
  })
  updatedAt: Date = new Date();
}

export class SocialPostResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true
  })
  success: boolean = false;

  @ApiProperty({
    description: 'Platform post ID or message',
    example: '1234567890',
    required: false
  })
  postId?: string = '';

  @ApiProperty({
    description: 'Post URL if available',
    example: 'https://twitter.com/KanakaProtocol/status/1234567890',
    required: false
  })
  @IsUrl()
  @IsOptional()
  postUrl?: string = '';
}
