import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Metric } from './entities/metric.entity';
import { Correlation } from './entities/correlation.entity';
import { CDR } from './entities/cdr.entity';
import { StarknetService } from '../../common/services/starknet.service';
import { MetricsGateway } from '../../common/gateways/metrics.gateway';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Metric)
    private metricRepository: Repository<Metric>,
    @InjectRepository(Correlation)
    private correlationRepository: Repository<Correlation>,
    @InjectRepository(CDR)
    private cdrRepository: Repository<CDR>,
    private starknetService: StarknetService,
    private metricsGateway: MetricsGateway,
    private redisService: RedisService,
  ) {}

  async getPoolMetrics(poolId: number): Promise<Metric[]> {
    const cacheKey = `metrics:pool:${poolId}`;
    const cachedMetrics = await this.redisService.getJson<Metric[]>(cacheKey);

    if (cachedMetrics) {
      return cachedMetrics;
    }

    const metrics = await this.metricRepository.find({
      where: { poolId },
      order: { timestamp: 'DESC' },
      take: 100, // Last 100 data points
    });

    await this.redisService.setJson(cacheKey, metrics, 300); // Cache for 5 minutes
    return metrics;
  }

  async getCorrelations(): Promise<Correlation[]> {
    const cacheKey = 'correlations:latest';
    const cachedCorrelations = await this.redisService.getJson<Correlation[]>(cacheKey);

    if (cachedCorrelations) {
      return cachedCorrelations;
    }

    const correlations = await this.correlationRepository.find({
      order: { timestamp: 'DESC' },
      take: 1, // Get latest correlation matrix
    });

    await this.redisService.setJson(cacheKey, correlations, 300);
    return correlations;
  }

  async getCDRMetrics(poolId: number): Promise<CDR[]> {
    const cacheKey = `cdr:pool:${poolId}`;
    const cachedCDR = await this.redisService.getJson<CDR[]>(cacheKey);

    if (cachedCDR) {
      return cachedCDR;
    }

    const cdrMetrics = await this.cdrRepository.find({
      where: { poolId },
      order: { timestamp: 'DESC' },
      take: 30, // Last 30 days
    });

    await this.redisService.setJson(cacheKey, cdrMetrics, 300);
    return cdrMetrics;
  }

  async updateMetrics(poolId: number, metrics: Partial<Metric>): Promise<Metric> {
    const metric = this.metricRepository.create({
      poolId,
      ...metrics,
      timestamp: new Date(),
    });

    await this.metricRepository.save(metric);
    
    // Invalidate cache
    await this.redisService.del(`metrics:pool:${poolId}`);

    // Broadcast update via WebSocket
    this.metricsGateway.broadcastMetricUpdate('pool', {
      poolId,
      metrics: metric,
    });

    return metric;
  }

  async updateCorrelations(correlationMatrix: number[][]): Promise<Correlation> {
    const correlation = this.correlationRepository.create({
      matrix: correlationMatrix,
      timestamp: new Date(),
    });

    await this.correlationRepository.save(correlation);
    
    // Invalidate cache
    await this.redisService.del('correlations:latest');

    // Update Starknet oracle
    await this.starknetService.updateMetrics(
      [], // volatilities
      correlationMatrix,
      [], // pools
    );

    // Broadcast update via WebSocket
    this.metricsGateway.broadcastMetricUpdate('correlation', correlation);

    return correlation;
  }

  async updateCDR(poolId: number, cdrData: Partial<CDR>): Promise<CDR> {
    const cdr = this.cdrRepository.create({
      poolId,
      ...cdrData,
      timestamp: new Date(),
    });

    await this.cdrRepository.save(cdr);
    
    // Invalidate cache
    await this.redisService.del(`cdr:pool:${poolId}`);

    // Broadcast update via WebSocket
    this.metricsGateway.broadcastMetricUpdate('cdr', {
      poolId,
      cdr: cdr,
    });

    return cdr;
  }
}
