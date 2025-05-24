import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { RewardDistributorService } from './reward-distributor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DistributeRewardDto, AuthorizeDistributorDto } from '../../common/dtos/reward.dto';

@ApiTags('Reward Distributor')
@Controller('reward-distributor')
export class RewardDistributorController {
  constructor(private readonly rewardDistributorService: RewardDistributorService) {}

  @Get('rewards/:user')
  @ApiOperation({ summary: 'Get rewards for a user' })
  @ApiParam({ name: 'user', description: 'User address' })
  @ApiResponse({
    status: 200,
    description: 'Returns the rewards for the specified user',
  })
  async getUserRewards(@Param('user') user: string) {
    return await this.rewardDistributorService.getUserRewards(user);
  }

  @Get('rewards/balance/:user')
  @ApiOperation({ summary: 'Get reward balance for a user' })
  @ApiParam({ name: 'user', description: 'User address' })
  @ApiResponse({
    status: 200,
    description: 'Returns the reward balance for the specified user',
  })
  async getRewards(@Param('user') user: string) {
    return { rewards: await this.rewardDistributorService.getRewards(user) };
  }

  @Get('total-distributed')
  @ApiOperation({ summary: 'Get total distributed rewards' })
  @ApiResponse({
    status: 200,
    description: 'Returns the total distributed rewards',
  })
  async getTotalDistributed() {
    return { totalDistributed: await this.rewardDistributorService.getTotalDistributed() };
  }

  @Get('distributors')
  @ApiOperation({ summary: 'Get authorized distributors' })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of authorized distributors',
  })
  async getAuthorizedDistributors() {
    return await this.rewardDistributorService.getAuthorizedDistributors();
  }

  @Get('distributors/:address')
  @ApiOperation({ summary: 'Check if an address is an authorized distributor' })
  @ApiParam({ name: 'address', description: 'Distributor address' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the address is an authorized distributor',
  })
  async isAuthorizedDistributor(@Param('address') address: string) {
    return { isAuthorized: await this.rewardDistributorService.isAuthorizedDistributor(address) };
  }

  @Post('distribute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Distribute rewards to a user' })
  @ApiBody({ type: DistributeRewardDto })
  @ApiResponse({
    status: 200,
    description: 'The rewards have been successfully distributed',
  })
  async distributeReward(@Body() dto: DistributeRewardDto, @Req() req: any) {
    return await this.rewardDistributorService.distributeReward(dto, req.user.privateKey);
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim rewards' })
  @ApiResponse({
    status: 200,
    description: 'The rewards have been successfully claimed',
  })
  async claimRewards(@Req() req: any) {
    return await this.rewardDistributorService.claimRewards(req.user.privateKey);
  }

  @Post('distributors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Authorize a distributor (Admin only)' })
  @ApiBody({ type: AuthorizeDistributorDto })
  @ApiResponse({
    status: 200,
    description: 'The distributor has been successfully authorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  })
  async authorizeDistributor(@Body() dto: AuthorizeDistributorDto, @Req() req: any) {
    return await this.rewardDistributorService.authorizeDistributor(dto, req.user.privateKey);
  }

  @Delete('distributors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Revoke a distributor (Admin only)' })
  @ApiBody({ type: AuthorizeDistributorDto })
  @ApiResponse({
    status: 200,
    description: 'The distributor has been successfully revoked',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  })
  async revokeDistributor(@Body() dto: AuthorizeDistributorDto, @Req() req: any) {
    return await this.rewardDistributorService.revokeDistributor(dto, req.user.privateKey);
  }
}