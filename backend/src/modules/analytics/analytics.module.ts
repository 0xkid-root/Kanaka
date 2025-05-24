import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Metric } from './entities/metric.entity';
import { Correlation } from './entities/correlation.entity';
import { CDR } from './entities/cdr.entity';
import { StarknetService } from '../../common/services/starknet.service';
import { MetricsGateway } from '../../common/gateways/metrics.gateway';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Metric, Correlation, CDR])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, StarknetService, MetricsGateway, RedisService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
