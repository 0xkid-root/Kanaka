import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DefiService } from './defi.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DepositDto, WithdrawDto } from '../../common/dtos/defi.dto';
import { Pool } from './entities/pool.entity';
import { Transaction } from './entities/transaction.entity';

@ApiTags('DeFi')
@Controller('defi')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DefiController {
  constructor(private readonly defiService: DefiService) {}

  @Get('pools')
  @ApiOperation({ summary: 'List all available pools' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all available pools',
    type: [Pool],
  })
  async listPools(): Promise<Pool[]> {
    return await this.defiService.listPools();
  }

  @Get('pools/:id')
  @ApiOperation({ summary: 'Get pool details' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Returns details of a specific pool',
    type: Pool,
  })
  async getPool(@Param('id') id: number): Promise<Pool> {
    return await this.defiService.getPool(id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds into a pool' })
  @ApiBody({ type: DepositDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the created transaction',
    type: Transaction,
  })
  async deposit(@Req() req: any, @Body() depositDto: DepositDto): Promise<Transaction> {
    return await this.defiService.deposit(
      req.user.id,
      depositDto.poolId,
      depositDto.amount,
      req.user.walletAddress,
    );
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw funds from a pool' })
  @ApiBody({ type: WithdrawDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the created transaction',
    type: Transaction,
  })
  async withdraw(@Req() req: any, @Body() withdrawDto: WithdrawDto): Promise<Transaction> {
    return await this.defiService.withdraw(
      req.user.id,
      withdrawDto.poolId,
      withdrawDto.amount,
      req.user.walletAddress,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of user transactions',
    type: [Transaction],
  })
  async getUserTransactions(@Req() req: any): Promise<Transaction[]> {
    return await this.defiService.getUserTransactions(req.user.id);
  }

  @Get('pools/:id/balance')
  @ApiOperation({ summary: 'Get user balance in a pool' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Returns user balance in the specified pool',
    type: Number,
  })
  async getUserPoolBalance(
    @Req() req: any,
    @Param('id') poolId: number,
  ): Promise<number> {
    return await this.defiService.getUserPoolBalance(
      req.user.id,
      poolId,
      req.user.walletAddress,
    );
  }
}
