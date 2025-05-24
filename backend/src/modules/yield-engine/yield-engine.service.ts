import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { YieldHarvest } from './entities/yield-harvest.entity';
import { PoolWeight } from './entities/pool-weight.entity';
import { Contract } from 'starknet';

interface YieldHarvestedEvent {
  poolId: string;
  amount: string;
}

interface StarknetEvent {
  name: string;
  args?: Record<string, unknown>;
}

@Injectable()
export class YieldEngineService implements OnModuleInit {
  private readonly logger: AppLoggerService;
  private yieldEngineContract!: Contract;

  constructor(
    @InjectRepository(YieldHarvest)
    private yieldHarvestRepository: Repository<YieldHarvest>,
    @InjectRepository(PoolWeight)
    private poolWeightRepository: Repository<PoolWeight>,
    private contractService: ContractService,
    private transactionService: TransactionService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(YieldEngineService.name);
  }

  private handleError(error: unknown, context: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${errorMessage}`);
    throw error;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing Yield Engine service');
      this.yieldEngineContract = await this.contractService.getContract('yieldEngine');
      await this.subscribeToEvents();
      this.logger.log('Yield Engine service initialized successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize Yield Engine service: ${errorMessage}`);
    }
  }

  private async subscribeToEvents(): Promise<void> {
    try {
      this.logger.log('Subscribing to Yield Engine events');
      
      // Rebalanced event
      this.yieldEngineContract.on('Rebalanced', async (event: { newWeights: string[] }) => {
        try {
          if (!event.newWeights) {
            throw new Error('Invalid event data: newWeights is undefined');
          }
          
          this.logger.debug(`Processing Rebalanced event, new weights: ${event.newWeights.join(', ')}`);
          
          // Store new weights in database
          for (let i = 0; i < event.newWeights.length; i++) {
            const weight = event.newWeights[i];
            if (weight === undefined) {
              this.logger.warn(`Missing weight for pool ${i}, skipping`);
              continue;
            }
            
            const poolId = i.toString();
            await this.poolWeightRepository.save({
              poolId,
              weight: weight.toString(),
            });
          }
          
          this.logger.debug('Successfully processed Rebalanced event');
        } catch (error: unknown) {
          this.handleError(error, 'Failed to process Rebalanced event');
        }
      });

      // YieldHarvested event
      this.yieldEngineContract.on('YieldHarvested', async (event: YieldHarvestedEvent) => {
        try {
          if (!event.poolId || !event.amount) {
            throw new Error('Invalid event data: missing poolId or amount');
          }
          
          this.logger.debug(`Processing YieldHarvested event for pool ${event.poolId}, amount: ${event.amount}`);
          
          const harvest = this.yieldHarvestRepository.create({
            poolId: event.poolId.toString(),
            amount: event.amount.toString(),
            timestamp: Math.floor(Date.now() / 1000),
          });
          
          await this.yieldHarvestRepository.save(harvest);
          this.logger.debug(`Saved yield harvest for pool ${event.poolId} to database`);
        } catch (error: unknown) {
          this.handleError(error, 'Failed to process YieldHarvested event');
        }
      });
      
      this.logger.log('Successfully subscribed to Yield Engine events');
    } catch (error: unknown) {
      this.handleError(error, 'Failed to subscribe to events');
    }
  }

  async getPoolWeight(poolId: number): Promise<string | null> {
    try {
      const poolWeight = await this.poolWeightRepository.findOne({
        where: { poolId: poolId.toString() }
      });
      return poolWeight?.weight || null;
    } catch (error: unknown) {
      this.handleError(error, `Failed to get weight for pool ${poolId}`);
    }
  }

  async getPoolCount(): Promise<number> {
    try {
      const result = await this.yieldEngineContract.call('getPoolCount');
      // Starknet contract calls return the first value if no name is specified
      return Number(result.toString());
    } catch (error: unknown) {
      this.handleError(error, 'Failed to get pool count');
    }
  }

  async poolExists(poolId: number): Promise<boolean> {
    try {
      const count = await this.getPoolCount();
      return poolId >= 0 && poolId < count;
    } catch (error: unknown) {
      this.handleError(error, `Failed to check existence of pool ${poolId}`);
    }
  }

  async rebalance(newWeights: string[], privateKey: string): Promise<{ success: boolean; txHash: string; newWeights: string[] }> {
    try {
      if (!Array.isArray(newWeights) || newWeights.length === 0) {
        throw new Error('Invalid newWeights: must be a non-empty array');
      }
      
      this.logger.log(`Rebalancing pool weights: ${newWeights.join(', ')}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'yieldEngine',
        'rebalance',
        [newWeights],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying rebalance transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      this.logger.log(`Successfully rebalanced pool weights, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        txHash: receipt.transactionHash,
        newWeights,
      };
    } catch (error: unknown) {
      this.handleError(error, 'Failed to rebalance pool weights');
    }
  }

  async harvestYield(poolId: number, privateKey: string): Promise<{ success: boolean; txHash: string; yieldAmount: string; poolId: number }> {
    try {
      if (poolId < 0) {
        throw new Error('Invalid poolId: must be a non-negative number');
      }
      
      this.logger.log(`Harvesting yield for pool ${poolId}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'yieldEngine',
        'harvestYield',
        [poolId],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying harvestYield transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      let harvestedAmount = '0';
      if (receipt.events) {
        const yieldHarvestedEvent = receipt.events.find(
          (event: unknown): event is StarknetEvent =>
            event !== null &&
            typeof event === 'object' &&
            'name' in event &&
            event.name === 'YieldHarvested'
        );
        if (yieldHarvestedEvent?.args?.amount) {
          harvestedAmount = yieldHarvestedEvent.args.amount.toString();
        }
      }
      
      this.logger.log(`Successfully harvested yield for pool ${poolId}, amount: ${harvestedAmount}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        txHash: receipt.transactionHash,
        yieldAmount: harvestedAmount,
        poolId
      };
    } catch (error: unknown) {
      this.handleError(error, `Failed to harvest yield for pool ${poolId}`);
    }
  }

  async onDeposit(poolId: number, amount: string, privateKey: string): Promise<{ success: boolean; txHash: string; poolId: number; amount: string }> {
    try {
      if (poolId < 0) {
        throw new Error('Invalid poolId: must be a non-negative number');
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      this.logger.log(`Processing deposit for pool ${poolId}, amount: ${amount}`);

      const receipt = await this.transactionService.executeTransaction(
        'yieldEngine',
        'deposit',
        [poolId, amount],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying deposit transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );

      this.logger.log(`Successfully processed deposit, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        txHash: receipt.transactionHash,
        poolId,
        amount
      };
    } catch (error: unknown) {
      this.handleError(error, `Failed to process deposit for pool ${poolId}`);
    }
  }

  async onWithdrawal(poolId: number, amount: string, privateKey: string): Promise<{ success: boolean; txHash: string; poolId: number; amount: string }> {
    try {
      if (poolId < 0) {
        throw new Error('Invalid poolId: must be a non-negative number');
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      this.logger.log(`Processing withdrawal for pool ${poolId}, amount: ${amount}`);

      const receipt = await this.transactionService.executeTransaction(
        'yieldEngine',
        'withdraw',
        [poolId, amount],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying withdrawal transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );

      this.logger.log(`Successfully processed withdrawal, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        txHash: receipt.transactionHash,
        poolId,
        amount
      };
    } catch (error: unknown) {
      this.handleError(error, `Failed to process withdrawal from pool ${poolId}`);
    }
  }
}
