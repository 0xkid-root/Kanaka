import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { User } from './entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { 
  CreateNonceDto, 
  VerifySignatureDto, 
  UpdateProfileDto,
  UpdateRolesDto
} from '../../common/dtos/user.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('nonce')
  @ApiOperation({ summary: 'Get authentication nonce for wallet' })
  @ApiResponse({
    status: 200,
    description: 'Returns a message to be signed by the wallet',
  })
  @ApiBody({ type: CreateNonceDto })
  async createNonce(@Body() { walletAddress }: CreateNonceDto) {
    const message = await this.userService.createNonce(walletAddress);
    return { message };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify wallet signature and get JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT token for authenticated user',
  })
  @ApiBody({ type: VerifySignatureDto })
  async verifySignature(@Body() { walletAddress, signature }: VerifySignatureDto) {
    return await this.userService.verifySignature(walletAddress, signature);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user profile',
  })
  async getProfile(@Req() req: any) {
    return await this.userService.findById(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated user profile',
  })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(@Req() req: any, @Body() data: UpdateProfileDto) {
    // Convert UpdateProfileDto to Partial<User>
    // Convert UpdateProfileDto to Partial<User> with proper handling of undefined values
    const userData: Partial<User> = {};
    if (data.twitterId !== undefined) userData.twitterId = data.twitterId;
    if (data.discordId !== undefined) userData.discordId = data.discordId;
    return await this.userService.updateProfile(req.user.id, userData);
  }

  @Put('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Update user roles (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated user with new roles',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  })
  @ApiBody({ type: UpdateRolesDto })
  async updateRoles(@Body() data: UpdateRolesDto) {
    return await this.userService.updateUserRoles(data.userId, data.roles);
  }
}
