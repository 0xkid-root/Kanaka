import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateMetricsDto, UpdateCorrelationsDto, UpdateCDRDto } from '../../common/dtos/analytics.dto';
import { Metric } from './entities/metric.entity';
import { Correlation } from './entities/correlation.entity';
import { CDR } from './entities/cdr.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('pools/:id/metrics')
  @ApiOperation({ summary: 'Get pool metrics' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Returns metrics for the specified pool',
    type: [Metric],
  })
  async getPoolMetrics(@Param('id') poolId: number): Promise<Metric[]> {
    return await this.analyticsService.getPoolMetrics(poolId);
  }

  @Get('correlations')
  @ApiOperation({ summary: 'Get latest correlation matrix' })
  @ApiResponse({
    status: 200,
    description: 'Returns the latest correlation matrix',
    type: [Correlation],
  })
  async getCorrelations(): Promise<Correlation[]> {
    return await this.analyticsService.getCorrelations();
  }

  @Get('pools/:id/cdr')
  @ApiOperation({ summary: 'Get pool CDR metrics' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Returns CDR metrics for the specified pool',
    type: [CDR],
  })
  async getCDRMetrics(@Param('id') poolId: number): Promise<CDR[]> {
    return await this.analyticsService.getCDRMetrics(poolId);
  }

  @Post('pools/:id/metrics')
  @ApiOperation({ summary: 'Update pool metrics' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateMetricsDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the updated metrics',
    type: Metric,
  })
  async updateMetrics(
    @Param('id') poolId: number,
    @Body() metricsDto: UpdateMetricsDto,
  ): Promise<Metric> {
    return await this.analyticsService.updateMetrics(poolId, metricsDto);
  }

  @Post('correlations')
  @ApiOperation({ summary: 'Update correlation matrix' })
  @ApiBody({ type: UpdateCorrelationsDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the updated correlation matrix',
    type: Correlation,
  })
  async updateCorrelations(
    @Body() correlationsDto: UpdateCorrelationsDto,
  ): Promise<Correlation> {
    return await this.analyticsService.updateCorrelations(correlationsDto.matrix);
  }

  @Post('pools/:id/cdr')
  @ApiOperation({ summary: 'Update pool CDR metrics' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ type: UpdateCDRDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the updated CDR metrics',
    type: CDR,
  })
  async updateCDR(
    @Param('id') poolId: number,
    @Body() cdrDto: UpdateCDRDto,
  ): Promise<CDR> {
    return await this.analyticsService.updateCDR(poolId, cdrDto);
  }
}
