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
import { StrategyRegistryService } from './strategy-registry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { 
  AddPoolDto, 
  UpdatePoolDto, 
  PoolDto, 
  StrategyExecutionDto,
  RebalanceWeightsDto
} from '../../common/dtos/strategy.dto';

@ApiTags('Strategy Registry')
@Controller('strategy-registry')
export class StrategyRegistryController {
  constructor(private readonly strategyRegistryService: StrategyRegistryService) {}

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
    type: [PoolDto]
  })
  async getPools(
    @Query('active', new DefaultValuePipe(false), ParseBoolPipe) active: boolean,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    try {
      return await this.strategyRegistryService.getPools(active, limit, offset);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch pools',
          message: error.message,
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
    type: PoolDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  async getPool(@Param('id') id: string) {
    try {
      const pool = await this.strategyRegistryService.getPool(id);
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
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
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

  @Get('pool-count')
  @ApiOperation({ summary: 'Get total number of pools' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the total number of pools',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          example: 5
        }
      }
    }
  })
  async getPoolCount() {
    try {
      const count = await this.strategyRegistryService.getPoolCount();
      return { count };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch pool count',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('valid-deposit/:poolId/:amount')
  @ApiOperation({ summary: 'Check if a deposit is valid' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiParam({ name: 'amount', description: 'Deposit amount' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns whether the deposit is valid',
    schema: {
      type: 'object',
      properties: {
        isValid: {
          type: 'boolean',
          example: true
        },
        reason: {
          type: 'string',
          example: null,
          nullable: true
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
    description: 'Invalid amount format',
  })
  async isValidDeposit(
    @Param('poolId') poolId: string,
    @Param('amount') amount: string,
  ) {
    try {
      // Check if pool exists
      const pool = await this.strategyRegistryService.getPool(poolId);
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
      
      // Validate amount format
      if (!amount.match(/^[0-9]+$/)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Amount must be a valid number in wei (no decimals)',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      const isValid = await this.strategyRegistryService.isValidDeposit(poolId, amount);
      let reason = null;
      
      if (!isValid) {
        // Check why the deposit is invalid
        if (BigInt(amount) < BigInt(pool.minDeposit)) {
          reason = `Amount is below minimum deposit of ${pool.minDeposit}`;
        } else if (pool.maxCapacity !== '0' && BigInt(amount) > BigInt(pool.maxCapacity)) {
          reason = `Amount exceeds maximum capacity of ${pool.maxCapacity}`;
        } else if (!pool.active) {
          reason = 'Pool is not active';
        }
      }
      
      return { isValid, reason };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to validate deposit',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('executions/:poolId')
  @ApiOperation({ summary: 'Get strategy executions for a pool' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of executions to return'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Number of executions to skip'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the strategy executions for the specified pool',
    type: [StrategyExecutionDto]
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  async getStrategyExecutions(
    @Param('poolId') poolId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    try {
      // Check if pool exists
      const pool = await this.strategyRegistryService.getPool(poolId);
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
      
      return await this.strategyRegistryService.getStrategyExecutions(poolId, limit, offset);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to fetch strategy executions',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('pools')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Add a new pool (Admin only)' })
  @ApiBody({ type: AddPoolDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The pool has been successfully added',
    type: PoolDto
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
      return await this.strategyRegistryService.addPool(dto, req.user.privateKey);
    } catch (error) {
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

  @Post('pools/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Update a pool (Admin only)' })
  @ApiBody({ type: UpdatePoolDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The pool has been successfully updated',
    type: PoolDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pool data',
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
    description: 'Forbidden - requires admin role',
  })
  async updatePool(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdatePoolDto, 
    @Req() req: any
  ) {
    try {
      // Check if pool exists
      const pool = await this.strategyRegistryService.getPool(dto.poolId);
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
      
      return await this.strategyRegistryService.updatePool(dto, req.user.privateKey);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to update pool',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('rebalance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute rebalance' })
  @ApiBody({ type: RebalanceWeightsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The rebalance has been successfully executed',
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
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid weights data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async executeRebalance(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: RebalanceWeightsDto, 
    @Req() req: any
  ) {
    try {
      // Validate weights count matches pool count
      const poolCount = await this.strategyRegistryService.getPoolCount();
      if (dto.weights.length !== poolCount) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: `Number of weights (${dto.weights.length}) does not match number of pools (${poolCount})`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.strategyRegistryService.executeRebalance(dto.weights, req.user.privateKey);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to execute rebalance',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}