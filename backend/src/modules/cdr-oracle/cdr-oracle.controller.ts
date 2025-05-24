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
  ApiSecurity,
} from '@nestjs/swagger';
import { CDROracleService } from './cdr-oracle.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UpdatePoolMetricsDto,
  UpdateVolatilityDto,
  UpdateYieldRateDto,
  UpdateCorrelationDto,
} from '../../common/dtos/pool-metrics.dto';

@ApiTags('CDR Oracle')
@Controller('cdr-oracle')
export class CDROracleController {
  constructor(private readonly cdrOracleService: CDROracleService) {}

  @Get('metrics/:poolId')
  @ApiOperation({ summary: 'Get pool metrics' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the metrics for the specified pool',
  })
  async getPoolMetrics(@Param('poolId') poolId: string) {
    return await this.cdrOracleService.getPoolMetrics(poolId);
  }

  @Get('correlation/:poolA/:poolB')
  @ApiOperation({ summary: 'Get correlation between two pools' })
  @ApiParam({ name: 'poolA', description: 'First Pool ID' })
  @ApiParam({ name: 'poolB', description: 'Second Pool ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the correlation between the specified pools',
  })
  async getCorrelation(
    @Param('poolA') poolA: string,
    @Param('poolB') poolB: string,
  ) {
    return { correlation: await this.cdrOracleService.getCorrelation(poolA, poolB) };
  }

  @Get('yield/:poolId')
  @ApiOperation({ summary: 'Get pool yield' })
  @ApiParam({ name: 'poolId', description: 'Pool ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the yield for the specified pool',
  })
  async getPoolYield(@Param('poolId') poolId: string) {
    return await this.cdrOracleService.getPoolYield(poolId);
  }

  @Post('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'oracle')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Update pool metrics (Admin/Oracle only)' })
  @ApiBody({ type: UpdatePoolMetricsDto })
  @ApiResponse({
    status: 200,
    description: 'The pool metrics have been successfully updated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin or oracle role',
  })
  async updatePoolMetrics(@Body() dto: UpdatePoolMetricsDto, @Req() req: any) {
    return await this.cdrOracleService.updatePoolMetrics(dto, req.user.privateKey);
  }

  @Post('volatility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'oracle')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Update pool volatility (Admin/Oracle only)' })
  @ApiBody({ type: UpdateVolatilityDto })
  @ApiResponse({
    status: 200,
    description: 'The pool volatility has been successfully updated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin or oracle role',
  })
  async updateVolatility(@Body() dto: UpdateVolatilityDto, @Req() req: any) {
    return await this.cdrOracleService.updateVolatility(dto, req.user.privateKey);
  }

  @Post('yield-rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'oracle')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Update pool yield rate (Admin/Oracle only)' })
  @ApiBody({ type: UpdateYieldRateDto })
  @ApiResponse({
    status: 200,
    description: 'The pool yield rate has been successfully updated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin or oracle role',
  })
  async updateYieldRate(@Body() dto: UpdateYieldRateDto, @Req() req: any) {
    return await this.cdrOracleService.updateYieldRate(dto, req.user.privateKey);
  }

  @Post('correlation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'oracle')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  @ApiOperation({ summary: 'Update correlation between two pools (Admin/Oracle only)' })
  @ApiBody({ type: UpdateCorrelationDto })
  @ApiResponse({
    status: 200,
    description: 'The correlation has been successfully updated',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin or oracle role',
  })
  async updateCorrelation(@Body() dto: UpdateCorrelationDto, @Req() req: any) {
    return await this.cdrOracleService.updateCorrelation(dto, req.user.privateKey);
  }
}