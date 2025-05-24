import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { PoolMetrics } from './entities/pool-metrics.entity';
import { PoolCorrelation } from './entities/pool-correlation.entity';
import {
  UpdatePoolMetricsDto,
  UpdateVolatilityDto,
  UpdateYieldRateDto,
  UpdateCorrelationDto,
} from '../../common/dtos/pool-metrics.dto';

interface MetricsUpdatedEvent {
  poolId: string;
  tvl: string;
  volatility: string;
  yieldRate: string;
}

interface CorrelationUpdatedEvent {
  poolA: string;
  poolB: string;
  correlation: string;
}

@Injectable()
export class CDROracleService implements OnModuleInit {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(PoolMetrics)
    private poolMetricsRepository: Repository<PoolMetrics>,
    @InjectRepository(PoolCorrelation)
    private poolCorrelationRepository: Repository<PoolCorrelation>,
    private contractService: ContractService,
    private transactionService: TransactionService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(CDROracleService.name);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing CDR Oracle service');
      await this.subscribeToEvents();
      this.logger.log('CDR Oracle service initialized successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initialize CDR Oracle service: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to initialize CDR Oracle service: ${String(error)}`);
      }
    }
  }

  private async subscribeToEvents() {
    try {
      this.logger.log('Subscribing to CDR Oracle events');
      const contract = await this.contractService.getContract('cdrOracle');

      contract.on('MetricsUpdated', async (event: MetricsUpdatedEvent) => {
        try {
          this.logger.debug(`Processing MetricsUpdated event for pool ${event.poolId}`);
          
          const metrics = await this.poolMetricsRepository.findOne({
            where: { poolId: event.poolId.toString() }
          });

          if (metrics) {
            metrics.tvl = event.tvl.toString();
            metrics.volatility = event.volatility.toString();
            metrics.yieldRate = event.yieldRate.toString();
            metrics.lastUpdate = Math.floor(Date.now() / 1000);
            await this.poolMetricsRepository.save(metrics);
            this.logger.debug(`Updated metrics for pool ${event.poolId}`);
          } else {
            const newMetrics = this.poolMetricsRepository.create({
              poolId: event.poolId.toString(),
              tvl: event.tvl.toString(),
              volatility: event.volatility.toString(),
              yieldRate: event.yieldRate.toString(),
              lastUpdate: Math.floor(Date.now() / 1000),
            });
            await this.poolMetricsRepository.save(newMetrics);
            this.logger.debug(`Created new metrics for pool ${event.poolId}`);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing MetricsUpdated event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing MetricsUpdated event: ${String(error)}`);
          }
        }
      });

      contract.on('CorrelationUpdated', async (event: CorrelationUpdatedEvent) => {
        try {
          this.logger.debug(`Processing CorrelationUpdated event for pools ${event.poolA} and ${event.poolB}`);
          
          const correlation = await this.poolCorrelationRepository.findOne({
            where: {
              poolA: event.poolA.toString(),
              poolB: event.poolB.toString(),
            }
          });

          if (correlation) {
            correlation.correlation = event.correlation.toString();
            await this.poolCorrelationRepository.save(correlation);
            this.logger.debug(`Updated correlation between pools ${event.poolA} and ${event.poolB}`);
          } else {
            const newCorrelation = this.poolCorrelationRepository.create({
              poolA: event.poolA.toString(),
              poolB: event.poolB.toString(),
              correlation: event.correlation.toString(),
            });
            await this.poolCorrelationRepository.save(newCorrelation);
            this.logger.debug(`Created new correlation between pools ${event.poolA} and ${event.poolB}`);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing CorrelationUpdated event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing CorrelationUpdated event: ${String(error)}`);
          }
        }
      });
      
      this.logger.log('Successfully subscribed to CDR Oracle events');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to subscribe to CDR Oracle events: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to subscribe to CDR Oracle events: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async updatePoolMetrics(dto: UpdatePoolMetricsDto, privateKey: string) {
    try {
      this.logger.log(`Updating pool metrics for pool ${dto.poolId}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'cdrOracle',
        'update_pool_metrics',
        [dto.poolId, dto.amount, dto.isDeposit],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying updatePoolMetrics transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying updatePoolMetrics transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully updated pool metrics for pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolId: dto.poolId,
        amount: dto.amount,
        isDeposit: dto.isDeposit
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update pool metrics for pool ${dto.poolId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to update pool metrics for pool ${dto.poolId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async updateVolatility(dto: UpdateVolatilityDto, privateKey: string) {
    try {
      this.logger.log(`Updating volatility for pool ${dto.poolId} to ${dto.volatility}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'cdrOracle',
        'update_volatility',
        [dto.poolId, dto.volatility],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying updateVolatility transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying updateVolatility transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully updated volatility for pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolId: dto.poolId,
        volatility: dto.volatility
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update volatility for pool ${dto.poolId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to update volatility for pool ${dto.poolId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async updateYieldRate(dto: UpdateYieldRateDto, privateKey: string) {
    try {
      this.logger.log(`Updating yield rate for pool ${dto.poolId} to ${dto.yieldRate}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'cdrOracle',
        'update_yield_rate',
        [dto.poolId, dto.yieldRate],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying updateYieldRate transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying updateYieldRate transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully updated yield rate for pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolId: dto.poolId,
        yieldRate: dto.yieldRate
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update yield rate for pool ${dto.poolId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to update yield rate for pool ${dto.poolId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async updateCorrelation(dto: UpdateCorrelationDto, privateKey: string) {
    try {
      this.logger.log(`Updating correlation between pools ${dto.poolA} and ${dto.poolB} to ${dto.correlation}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'cdrOracle',
        'update_correlation',
        [dto.poolA, dto.poolB, dto.correlation],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying updateCorrelation transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying updateCorrelation transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully updated correlation between pools ${dto.poolA} and ${dto.poolB}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolA: dto.poolA,
        poolB: dto.poolB,
        correlation: dto.correlation
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update correlation between pools ${dto.poolA} and ${dto.poolB}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to update correlation between pools ${dto.poolA} and ${dto.poolB}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getPoolMetrics(poolId: string) {
    try {
      this.logger.debug(`Getting metrics for pool ${poolId}`);
      
      const metrics = await this.transactionService.executeCall(
        'cdrOracle',
        'get_pool_metrics',
        [poolId]
      );
      
      return {
        tvl: metrics.tvl.toString(),
        volatility: metrics.volatility.toString(),
        yieldRate: metrics.yieldRate.toString(),
        lastUpdate: metrics.lastUpdate.toNumber(),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get metrics for pool ${poolId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get metrics for pool ${poolId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getCorrelation(poolA: string, poolB: string) {
    try {
      this.logger.debug(`Getting correlation between pools ${poolA} and ${poolB}`);
      
      const correlation = await this.transactionService.executeCall(
        'cdrOracle',
        'get_correlation',
        [poolA, poolB]
      );
      
      return correlation.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get correlation between pools ${poolA} and ${poolB}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get correlation between pools ${poolA} and ${poolB}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getPoolYield(poolId: string) {
    try {
      this.logger.debug(`Getting yield for pool ${poolId}`);
      
      const result = await this.transactionService.executeCall(
        'cdrOracle',
        'get_pool_yield',
        [poolId]
      );
      
      return {
        yield: result[0].toString(),
        lastUpdate: result[1].toNumber(),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get yield for pool ${poolId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get yield for pool ${poolId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getAllPoolMetrics(active = false) {
    try {
      this.logger.debug(`Getting all pool metrics, active only: ${active}`);
      
      let query = this.poolMetricsRepository.createQueryBuilder('metrics')
        .orderBy('metrics.lastUpdate', 'DESC');
      
      if (active) {
        query = query.innerJoin('pool', 'p', 'metrics.poolId = p.poolId')
          .where('p.active = :active', { active: true });
      }
      
      const metrics = await query.getMany();
      
      this.logger.debug(`Found ${metrics.length} pool metrics`);
      return metrics;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get all pool metrics: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get all pool metrics: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getAllCorrelations() {
    try {
      this.logger.debug('Getting all pool correlations');
      
      const correlations = await this.poolCorrelationRepository.find({
        order: { updatedAt: 'DESC' }
      });
      
      this.logger.debug(`Found ${correlations.length} pool correlations`);
      return correlations;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get all pool correlations: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get all pool correlations: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getOptimalPortfolioWeights() {
    try {
      this.logger.debug('Calculating optimal portfolio weights');
      
      const weights = await this.transactionService.executeCall(
        'cdrOracle',
        'get_optimal_weights',
        []
      );
      
      return weights.map((w: string) => w.toString());
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to calculate optimal portfolio weights: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to calculate optimal portfolio weights: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getPortfolioRisk(weights: string[]) {
    try {
      this.logger.debug(`Calculating portfolio risk for weights: ${weights.join(', ')}`);
      
      const risk = await this.transactionService.executeCall(
        'cdrOracle',
        'get_portfolio_risk',
        [weights]
      );
      
      return risk.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to calculate portfolio risk: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to calculate portfolio risk: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getPortfolioYield(weights: string[]) {
    try {
      this.logger.debug(`Calculating portfolio yield for weights: ${weights.join(', ')}`);
      
      const yield_ = await this.transactionService.executeCall(
        'cdrOracle',
        'get_portfolio_yield',
        [weights]
      );
      
      return yield_.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to calculate portfolio yield: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to calculate portfolio yield: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }
}