import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ValidationPipe,
  HttpStatus,
  HttpException,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { VaultManagerService } from './vault-manager.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContractAction } from '../../common/decorators/contract-action.decorator';
import { ContractAuthGuard } from '../../common/guards/contract-auth.guard';
import { 
  DepositDto, 
  WithdrawDto, 
  AddPoolDto, 
  PoolResponseDto, 
  PoolBalanceDto 
} from '../../common/dtos/vault.dto';

@ApiTags('Vault Manager')
@Controller('vault-manager')
export class VaultManagerController {
  constructor(private readonly vaultManagerService: VaultManagerService) {}

  @Get('pools')
  @ApiOperation({ summary: 'Get all pools' })
  @ApiQuery({ 
    name: 'active', 
    required: false, 
    type: Boolean,
    description: 'Filter for active pools only'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of pools to return'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Number of pools to skip'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of all pools',
    type: [PoolResponseDto]
  })
  async getPools(
    @Query('active', new DefaultValuePipe(false), ParseBoolPipe) active: boolean,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    try {
      return await this.vaultManagerService.getPools(active, limit, offset);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch pools',
          message: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pools/:id')
  @ApiOperation({ summary: 'Get pool by ID' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the pool details',
    type: PoolResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  async getPool(@Param('id') id: string) {
    try {
      const pool = await this.vaultManagerService.getPool(id);
      if (!pool) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return pool;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch pool',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('balance/:user/:poolId')
  @ApiOperation({ summary: 'Get user balance in a pool' })
  @ApiParam({ name: 'user', description: 'User address' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the user balance in the specified pool',
    schema: {
      type: 'object',
      properties: {
        balance: {
          type: 'string',
          example: '1000000000000000000'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user address',
  })
  async getBalance(
    @Param('user') user: string,
    @Param('poolId') poolId: string,
  ) {
    try {
      // Validate user address
      if (!user.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Invalid Ethereum address format',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Check if pool exists
      const pool = await this.vaultManagerService.getPool(poolId);
      if (!pool) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      const balance = await this.vaultManagerService.getBalance(user, poolId);
      return { balance };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch balance',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('total-supply/:poolId')
  @ApiOperation({ summary: 'Get total supply of a pool' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the total supply of the specified pool',
    schema: {
      type: 'object',
      properties: {
        totalSupply: {
          type: 'string',
          example: '10000000000000000000'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  async getTotalSupply(@Param('poolId') poolId: string) {
    try {
      // Check if pool exists
      const pool = await this.vaultManagerService.getPool(poolId);
      if (!pool) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      const totalSupply = await this.vaultManagerService.getTotalSupply(poolId);
      return { totalSupply };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch total supply',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('balances/:user')
  @ApiOperation({ summary: 'Get all balances for a user' })
  @ApiParam({ name: 'user', description: 'User address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all balances for the specified user',
    type: [PoolBalanceDto]
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user address',
  })
  async getPoolBalances(@Param('user') user: string) {
    try {
      // Validate user address
      if (!user.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Invalid Ethereum address format',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.vaultManagerService.getPoolBalances(user);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch balances',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard, ContractAuthGuard)
  @ContractAction({
    contract: 'Vault',
    action: 'deposit',
  })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deposit into a pool' })
  @ApiBody({ type: DepositDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The deposit has been successfully processed',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        txHash: {
          type: 'string',
          example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        },
        amount: {
          type: 'string',
          example: '1000000000000000000'
        },
        poolId: {
          type: 'string',
          example: 'pool-1'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid deposit data or insufficient funds',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Not authorized to perform this action',
  })
  async deposit(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: DepositDto, 
    @Req() req: any
  ) {
    try {
      // Check if pool exists
      const pool = await this.vaultManagerService.getPool(dto.poolId);
      if (!pool) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${dto.poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return await this.vaultManagerService.deposit(dto, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to process deposit',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard, ContractAuthGuard)
  @ContractAction({
    contract: 'Vault',
    action: 'withdraw',
  })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw from a pool' })
  @ApiBody({ type: WithdrawDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The withdrawal has been successfully processed',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true
        },
        txHash: {
          type: 'string',
          example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        },
        amount: {
          type: 'string',
          example: '1000000000000000000'
        },
        poolId: {
          type: 'string',
          example: 'pool-1'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid withdrawal data or insufficient balance',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Not authorized to perform this action',
  })
  async withdraw(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: WithdrawDto, 
    @Req() req: any
  ) {
    try {
      // Check if pool exists
      const pool = await this.vaultManagerService.getPool(dto.poolId);
      if (!pool) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${dto.poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      // Check if user has sufficient balance
      const userBalance = await this.vaultManagerService.getBalance(req.user.walletAddress, dto.poolId);
      if (BigInt(userBalance) < BigInt(dto.amount)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Insufficient balance for withdrawal',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.vaultManagerService.withdraw(dto, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to process withdrawal',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('pools')
  @UseGuards(JwtAuthGuard, RolesGuard, ContractAuthGuard)
  @Roles('admin')
  @ContractAction({
    contract: 'Vault',
    action: 'addPool',
    roles: ['admin'],
  })
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Add a new pool (Admin only)' })
  @ApiBody({ type: AddPoolDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The pool has been successfully added',
    type: PoolResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pool data or pool already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires admin role',
  })
  async addPool(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AddPoolDto, 
    @Req() req: any
  ) {
    try {
      // Check if pool already exists
      const existingPool = await this.vaultManagerService.getPool(dto.poolId);
      if (existingPool) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: `Pool with ID ${dto.poolId} already exists`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.vaultManagerService.addPool(dto, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to add pool',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}