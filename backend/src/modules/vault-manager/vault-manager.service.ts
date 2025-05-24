import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
// Error handler is now implemented locally in each service
import { PoolBalance, Pool } from './entities/vault.entity';
import { DepositDto, WithdrawDto, AddPoolDto } from '../../common/dtos/vault.dto';

@Injectable()
export class VaultManagerService implements OnModuleInit {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(PoolBalance)
    private poolBalanceRepository: Repository<PoolBalance>,
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
    private contractService: ContractService,
    private transactionService: TransactionService,
    // Will be used for error handling in future implementations
    // private errorHandler: ErrorHandlerService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(VaultManagerService.name);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing Vault Manager service');
      await this.subscribeToEvents();
      this.logger.log('Vault Manager service initialized successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to initialize Vault Manager service: ${errorMessage}`, errorStack);
    }
  }

  private async subscribeToEvents() {
    try {
      this.logger.log('Subscribing to Vault Manager events');
      const contract = await this.contractService.getContract('vaultManager');

      // Deposit event
      contract.on('Deposit', async (event: any) => {
        try {
          this.logger.debug(`Processing Deposit event for pool ${event.poolId} by ${event.user}, amount: ${event.amount}`);
          
          // Update pool balance
          const balance = await this.poolBalanceRepository.findOne({
            where: {
              poolId: event.poolId.toString(),
              user: event.user,
            }
          });

          if (balance) {
            balance.balance = (BigInt(balance.balance) + BigInt(event.amount)).toString();
            await this.poolBalanceRepository.save(balance);
            this.logger.debug(`Updated balance for user ${event.user} in pool ${event.poolId}`);
          } else {
            const newBalance = this.poolBalanceRepository.create({
              poolId: event.poolId.toString(),
              user: event.user,
              balance: event.amount.toString(),
            });
            await this.poolBalanceRepository.save(newBalance);
            this.logger.debug(`Created new balance for user ${event.user} in pool ${event.poolId}`);
          }

          // Update pool total supply
          const pool = await this.poolRepository.findOne({
            where: { poolId: event.poolId.toString() }
          });

          if (pool) {
            pool.totalSupply = (BigInt(pool.totalSupply) + BigInt(event.amount)).toString();
            await this.poolRepository.save(pool);
            this.logger.debug(`Updated total supply for pool ${event.poolId}`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(`Error processing Deposit event: ${errorMessage}`, errorStack);
        }
      });

      // Withdrawal event
      contract.on('Withdrawal', async (event: any) => {
        try {
          this.logger.debug(`Processing Withdrawal event for pool ${event.poolId} by ${event.user}, amount: ${event.amount}`);
          
          // Update pool balance
          const balance = await this.poolBalanceRepository.findOne({
            where: {
              poolId: event.poolId.toString(),
              user: event.user,
            }
          });

          if (balance) {
            balance.balance = (BigInt(balance.balance) - BigInt(event.amount)).toString();
            await this.poolBalanceRepository.save(balance);
            this.logger.debug(`Updated balance for user ${event.user} in pool ${event.poolId}`);
          }

          // Update pool total supply
          const pool = await this.poolRepository.findOne({
            where: { poolId: event.poolId.toString() }
          });

          if (pool) {
            pool.totalSupply = (BigInt(pool.totalSupply) - BigInt(event.amount)).toString();
            await this.poolRepository.save(pool);
            this.logger.debug(`Updated total supply for pool ${event.poolId}`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(`Error processing Withdrawal event: ${errorMessage}`, errorStack);
        }
      });
      
      // PoolAdded event
      contract.on('PoolAdded', async (event: any) => {
        try {
          this.logger.debug(`Processing PoolAdded event for pool ${event.poolId}, token: ${event.token}`);
          
          const existingPool = await this.poolRepository.findOne({
            where: { poolId: event.poolId.toString() }
          });
          
          if (!existingPool) {
            const pool = this.poolRepository.create({
              poolId: event.poolId.toString(),
              token: event.token,
              totalSupply: '0',
            });
            await this.poolRepository.save(pool);
            this.logger.debug(`Created new pool ${event.poolId}`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(`Error processing PoolAdded event: ${errorMessage}`, errorStack);
        }
      });
      
      this.logger.log('Successfully subscribed to Vault Manager events');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to Vault Manager events: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async deposit(dto: DepositDto, privateKey: string) {
    try {
      this.logger.log(`Depositing ${dto.amount} into pool ${dto.poolId}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'vaultManager',
        'deposit',
        [dto.poolId, dto.amount],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying deposit transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      this.logger.log(`Successfully deposited ${dto.amount} into pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolId: dto.poolId,
        amount: dto.amount
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to deposit into pool ${dto.poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async withdraw(dto: WithdrawDto, privateKey: string) {
    try {
      this.logger.log(`Withdrawing ${dto.amount} from pool ${dto.poolId}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'vaultManager',
        'withdraw',
        [dto.poolId, dto.amount],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying withdraw transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      this.logger.log(`Successfully withdrew ${dto.amount} from pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolId: dto.poolId,
        amount: dto.amount
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to withdraw from pool ${dto.poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async addPool(dto: AddPoolDto, privateKey: string) {
    try {
      this.logger.log(`Adding new pool ${dto.poolId} with token ${dto.token}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'vaultManager',
        'add_pool',
        [dto.poolId, dto.token],
        privateKey,
        {
          onRetry: (error, attempt) => {
            this.logger.warn(`Retrying addPool transaction (attempt ${attempt}): ${error.message}`);
          },
        }
      );
      
      // Create pool in database if it doesn't exist yet
      const existingPool = await this.poolRepository.findOne({
        where: { poolId: dto.poolId }
      });
      
      if (!existingPool) {
        const pool = this.poolRepository.create({
          poolId: dto.poolId,
          token: dto.token,
          totalSupply: '0',
        });
        await this.poolRepository.save(pool);
      }
      
      this.logger.log(`Successfully added pool ${dto.poolId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        poolId: dto.poolId,
        token: dto.token
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to add pool ${dto.poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getBalance(user: string, poolId: string) {
    try {
      this.logger.debug(`Getting balance for user ${user} in pool ${poolId}`);
      
      const balance = await this.transactionService.executeCall(
        'vaultManager',
        'get_balance',
        [user, poolId]
      );
      
      return balance.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get balance for user ${user} in pool ${poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getTotalSupply(poolId: string) {
    try {
      this.logger.debug(`Getting total supply for pool ${poolId}`);
      
      const totalSupply = await this.transactionService.executeCall(
        'vaultManager',
        'get_total_supply',
        [poolId]
      );
      
      return totalSupply.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get total supply for pool ${poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getPoolBalances(user: string) {
    try {
      this.logger.debug(`Getting all pool balances for user ${user}`);
      
      const balances = await this.poolBalanceRepository.find({
        where: { user },
        order: { updatedAt: 'DESC' }
      });
      
      // Enrich with pool information
      const enrichedBalances = await Promise.all(
        balances.map(async (balance) => {
          const pool = await this.poolRepository.findOne({
            where: { poolId: balance.poolId }
          });
          
          return {
            ...balance,
            token: pool ? pool.token : null,
            totalSupply: pool ? pool.totalSupply : null,
          };
        })
      );
      
      this.logger.debug(`Found ${balances.length} pool balances for user ${user}`);
      return enrichedBalances;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get pool balances for user ${user}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getPools(active = false, limit = 10, offset = 0) {
    try {
      this.logger.debug(`Getting pools, active only: ${active}, limit: ${limit}, offset: ${offset}`);
      
      let query = this.poolRepository.createQueryBuilder('pool')
        .orderBy('pool.createdAt', 'DESC')
        .skip(offset)
        .take(limit);
      
      // Note: 'active' column doesn't exist in Pool entity
      // All pools are considered active by default
      
      const pools = await query.getMany();
      
      // Enrich with additional information
      const enrichedPools = await Promise.all(
        pools.map(async (pool) => {
          try {
            const apy = await this.getPoolAPY(pool.poolId);
            return {
              ...pool,
              apy: parseFloat(apy),
            };
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to get APY for pool ${pool.poolId}: ${errorMessage}`);
            return {
              ...pool,
              apy: 0,
            };
          }
        })
      );
      
      this.logger.debug(`Found ${pools.length} pools`);
      return enrichedPools;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get pools: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getPool(poolId: string) {
    try {
      this.logger.debug(`Getting pool ${poolId}`);
      
      const pool = await this.poolRepository.findOne({
        where: { poolId }
      });
      
      if (pool) {
        let enrichedPool = { ...pool, apy: 0 };
        try {
          const apy = await this.getPoolAPY(poolId);
          enrichedPool.apy = parseFloat(apy);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to get APY for pool ${poolId}: ${errorMessage}`);
        }
        
        return enrichedPool;
      }
      
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get pool ${poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getPoolAPY(poolId: string) {
    try {
      this.logger.debug(`Getting APY for pool ${poolId}`);
      
      const apy = await this.transactionService.executeCall(
        'vaultManager',
        'get_pool_apy',
        [poolId]
      );
      
      return apy.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get APY for pool ${poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getPoolToken(poolId: string) {
    try {
      this.logger.debug(`Getting token for pool ${poolId}`);
      
      const token = await this.transactionService.executeCall(
        'vaultManager',
        'get_pool_token',
        [poolId]
      );
      
      return token;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get token for pool ${poolId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getPoolCount() {
    try {
      this.logger.debug('Getting pool count');
      
      const count = await this.transactionService.executeCall(
        'vaultManager',
        'get_pool_count',
        []
      );
      
      return count.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get pool count: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getUserTVL(user: string) {
    try {
      this.logger.debug(`Getting total value locked for user ${user}`);
      
      const tvl = await this.transactionService.executeCall(
        'vaultManager',
        'get_user_tvl',
        [user]
      );
      
      return tvl.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get TVL for user ${user}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async getTotalTVL() {
    try {
      this.logger.debug('Getting total TVL across all pools');
      
      const tvl = await this.transactionService.executeCall(
        'vaultManager',
        'get_total_tvl',
        []
      );
      
      return tvl.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get total TVL: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
