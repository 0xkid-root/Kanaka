import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { EventListenerService } from '../../common/services/event-listener.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { Pool, StrategyExecution } from './entities/strategy.entity';
import { AddPoolDto, UpdatePoolDto } from '../../common/dtos/strategy.dto';

@Injectable()
export class StrategyRegistryService implements OnModuleInit {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
    @InjectRepository(StrategyExecution)
    private strategyExecutionRepository: Repository<StrategyExecution>,
    private contractService: ContractService,
    private transactionService: TransactionService,
    private eventListenerService: EventListenerService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(StrategyRegistryService.name);
  }

  async onModuleInit() {
    this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    this.logger.log('Subscribing to strategy registry events');
    
    // Subscribe to PoolAdded events
    this.eventListenerService.on('PoolAdded', async (event) => {
      try {
        this.logger.log(`Processing PoolAdded event for pool ${event.poolId}`);
        
        const pool = this.poolRepository.create({
          poolId: event.poolId.toString(),
          token: event.token,
          strategy: event.strategy,
          active: true,
          minDeposit: '0',
          maxCapacity: '0',
        });
        
        await this.poolRepository.save(pool);
        this.logger.log(`Saved new pool ${event.poolId} to database`);
      } catch (error) {
        this.logger.error(`Error processing PoolAdded event: ${error.message}`, error.stack);
      }
    });

    // Subscribe to PoolUpdated events
    this.eventListenerService.on('PoolUpdated', async (event) => {
      try {
        this.logger.log(`Processing PoolUpdated event for pool ${event.poolId}`);
        
        await this.poolRepository.update(
          { poolId: event.poolId.toString() },
          {
            active: event.active,
            minDeposit: event.minDeposit.toString(),
            maxCapacity: event.maxCapacity.toString(),
          }
        );
        
        this.logger.log(`Updated pool ${event.poolId} in database`);
      } catch (error) {
        this.logger.error(`Error processing PoolUpdated event: ${error.message}`, error.stack);
      }
    });

    // Subscribe to StrategyExecuted events
    this.eventListenerService.on('StrategyExecuted', async (event) => {
      try {
        this.logger.log(`Processing StrategyExecuted event for pool ${event.poolId}, strategy ${event.strategy}`);
        
        const execution = this.strategyExecutionRepository.create({
          poolId: event.poolId.toString(),
          strategy: event.strategy,
          weight: '0', // Weight will be updated from yield engine events
        });
        
        await this.strategyExecutionRepository.save(execution);
        this.logger.log(`Saved strategy execution for pool ${event.poolId} to database`);
      } catch (error) {
        this.logger.error(`Error processing StrategyExecuted event: ${error.message}`, error.stack);
      }
    });
    
    this.logger.log('Successfully subscribed to all strategy registry events');
  }

  async addPool(dto: AddPoolDto, privateKey: string) {
    try {
      this.logger.log(`Adding new pool with token ${dto.token} and strategy ${dto.strategy}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'strategyRegistry',
        'add_pool',
        [dto.token, dto.strategy, dto.minDeposit, dto.maxCapacity],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying addPool transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      this.logger.log(`Successfully added new pool, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      this.logger.error(`Failed to add pool: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updatePool(dto: UpdatePoolDto, privateKey: string) {
    try {
      this.logger.log(`Updating pool ${dto.poolId}, active: ${dto.active}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'strategyRegistry',
        'update_pool',
        [dto.poolId, dto.active, dto.minDeposit, dto.maxCapacity],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying updatePool transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      this.logger.log(`Successfully updated pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      this.logger.error(`Failed to update pool ${dto.poolId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async executeRebalance(weights: string[], privateKey: string) {
    try {
      this.logger.log(`Executing rebalance with weights: ${weights.join(', ')}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'strategyRegistry',
        'execute_rebalance',
        [weights],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying executeRebalance transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      this.logger.log(`Successfully executed rebalance, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      this.logger.error(`Failed to execute rebalance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPool(poolId: string) {
    try {
      this.logger.debug(`Getting pool information for poolId: ${poolId}`);
      
      const pool = await this.transactionService.executeCall(
        'strategyRegistry',
        'get_pool',
        [poolId]
      );
      
      return {
        token: pool.token,
        strategy: pool.strategy,
        active: pool.active,
        minDeposit: pool.min_deposit.toString(),
        maxCapacity: pool.max_capacity.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get pool ${poolId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPoolCount() {
    try {
      this.logger.debug('Getting pool count');
      
      const count = await this.transactionService.executeCall(
        'strategyRegistry',
        'get_pool_count',
        []
      );
      
      return count.toString();
    } catch (error) {
      this.logger.error(`Failed to get pool count: ${error.message}`, error.stack);
      throw error;
    }
  }

  async isValidDeposit(poolId: string, amount: string) {
    try {
      this.logger.debug(`Checking if deposit is valid for poolId: ${poolId}, amount: ${amount}`);
      
      const isValid = await this.transactionService.executeCall(
        'strategyRegistry',
        'is_valid_deposit',
        [poolId, amount]
      );
      
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to check if deposit is valid for pool ${poolId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPools() {
    try {
      this.logger.debug('Getting all pools from database');
      
      const pools = await this.poolRepository.find({
        order: { createdAt: 'DESC' }
      });
      
      this.logger.debug(`Found ${pools.length} pools`);
      return pools;
    } catch (error) {
      this.logger.error(`Failed to get pools from database: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStrategyExecutions(poolId: string) {
    try {
      this.logger.debug(`Getting strategy executions for poolId: ${poolId}`);
      
      const executions = await this.strategyExecutionRepository.find({
        where: { poolId },
        order: { executedAt: 'DESC' }
      });
      
      this.logger.debug(`Found ${executions.length} strategy executions for pool ${poolId}`);
      return executions;
    } catch (error) {
      this.logger.error(`Failed to get strategy executions for pool ${poolId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
