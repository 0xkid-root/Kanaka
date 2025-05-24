import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  ValidationPipe,
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
import { YieldEngineService } from './yield-engine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { 
  RebalanceDto, 
  HarvestYieldDto, 
  PoolDepositDto, 
  PoolWithdrawalDto 
} from '../../common/dtos/yield-engine.dto';

interface AuthenticatedRequest extends Request {
  user: {
    privateKey: string;
  };
}

@ApiTags('Yield Engine')
@Controller('yield-engine')
export class YieldEngineController {
  constructor(private readonly yieldEngineService: YieldEngineService) {}

  @Get('pool/:id/weight')
  @ApiOperation({ summary: 'Get pool weight' })
  @ApiParam({ name: 'id', description: 'Pool ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the weight of the specified pool',
    schema: {
      type: 'object',
      properties: {
        weight: {
          type: 'string',
          example: '1000'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  async getPoolWeight(@Param('id', ParseIntPipe) id: number) {
    try {
      const weight = await this.yieldEngineService.getPoolWeight(id);
      if (!weight) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return { weight };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to get pool weight',
          message: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('rebalance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Rebalance pool weights (Admin only)' })
  @ApiBody({ type: RebalanceDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The weights have been successfully rebalanced',
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
        newWeights: {
          type: 'array',
          items: {
            type: 'string'
          },
          example: ['1000', '2000', '3000']
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
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires admin role',
  })
  async rebalance(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: RebalanceDto, 
    @Req() req: AuthenticatedRequest
  ) {
    try {
      // Validate weights
      const poolCount = await this.yieldEngineService.getPoolCount();
      if (dto.newWeights.length !== poolCount) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: `Number of weights (${dto.newWeights.length}) does not match number of pools (${poolCount})`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.yieldEngineService.rebalance(dto.newWeights, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to rebalance pools',
          message: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('harvest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Harvest yield from a pool (Admin only)' })
  @ApiBody({ type: HarvestYieldDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The yield has been successfully harvested',
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
        yieldAmount: {
          type: 'string',
          example: '1000000000000000000'
        },
        poolId: {
          type: 'number',
          example: 1
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pool ID or no yield to harvest',
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
  async harvestYield(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: HarvestYieldDto, 
    @Req() req: AuthenticatedRequest
  ) {
    try {
      // Check if pool exists
      const poolExists = await this.yieldEngineService.poolExists(dto.poolId);
      if (!poolExists) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${dto.poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return await this.yieldEngineService.harvestYield(dto.poolId, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to harvest yield',
          message: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('on-deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle deposit event' })
  @ApiBody({ type: PoolDepositDto })
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
        poolId: {
          type: 'number',
          example: 1
        },
        amount: {
          type: 'string',
          example: '1000000000000000000'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pool ID or amount',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async onDeposit(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: PoolDepositDto, 
    @Req() req: AuthenticatedRequest
  ) {
    try {
      // Check if pool exists
      const poolExists = await this.yieldEngineService.poolExists(dto.poolId);
      if (!poolExists) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${dto.poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return await this.yieldEngineService.onDeposit(dto.poolId, dto.amount, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to process deposit',
          message: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('on-withdrawal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle withdrawal event' })
  @ApiBody({ type: PoolWithdrawalDto })
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
        poolId: {
          type: 'number',
          example: 1
        },
        amount: {
          type: 'string',
          example: '1000000000000000000'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pool ID or amount',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pool not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Authentication required',
  })
  async onWithdrawal(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: PoolWithdrawalDto, 
    @Req() req: AuthenticatedRequest
  ) {
    try {
      // Check if pool exists
      const poolExists = await this.yieldEngineService.poolExists(dto.poolId);
      if (!poolExists) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: `Pool with ID ${dto.poolId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return await this.yieldEngineService.onWithdrawal(dto.poolId, dto.amount, req.user.privateKey);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to process withdrawal',
          message: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}