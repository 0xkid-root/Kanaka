import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { Reward, AuthorizedDistributor } from './entities/reward.entity';
import { DistributeRewardDto, AuthorizeDistributorDto } from '../../common/dtos/reward.dto';

// Define interfaces for contract events
interface RewardDistributedEvent {
  user: string;
  amount: string;
  reason: string;
}

interface RewardClaimedEvent {
  user: string;
}

interface DistributorAuthorizedEvent {
  distributor: string;
}

interface DistributorRevokedEvent {
  distributor: string;
}

// Define type for parsed log (for parseLog method)
interface ParsedLog {
  name: string;
  args: {
    amount: string;
    [key: string]: any;
  };
}

// Extend ContractService interface to include parseLog
interface ExtendedContractService extends ContractService {
  parseLog(contractName: string, log: any): ParsedLog | null;
}

// Update DistributeRewardDto to include reason
interface ExtendedDistributeRewardDto extends DistributeRewardDto {
  reason?: string;
}

@Injectable()
export class RewardDistributorService implements OnModuleInit {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
    @InjectRepository(AuthorizedDistributor)
    private distributorRepository: Repository<AuthorizedDistributor>,
    private contractService: ExtendedContractService,
    private transactionService: TransactionService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(RewardDistributorService.name);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing Reward Distributor service');
      await this.subscribeToEvents();
      this.logger.log('Reward Distributor service initialized successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initialize Reward Distributor service: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to initialize Reward Distributor service: ${String(error)}`);
      }
    }
  }

  private async subscribeToEvents() {
    try {
      this.logger.log('Subscribing to Reward Distributor events');
      const contract = await this.contractService.getContract('rewardDistributor');

      // RewardDistributed event
      contract.on('RewardDistributed', async (event: RewardDistributedEvent) => {
        try {
          this.logger.debug(`Processing RewardDistributed event for user ${event.user}, amount: ${event.amount}`);
          
          const reward = this.rewardRepository.create({
            user: event.user,
            amount: event.amount.toString(),
            reason: event.reason.toString(),
            claimed: false,
          });
          
          await this.rewardRepository.save(reward);
          this.logger.debug(`Saved reward for user ${event.user} to database`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing RewardDistributed event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing RewardDistributed event: ${String(error)}`);
          }
        }
      });

      // RewardClaimed event
      contract.on('RewardClaimed', async (event: RewardClaimedEvent) => {
        try {
          this.logger.debug(`Processing RewardClaimed event for user ${event.user}`);
          
          await this.rewardRepository.update(
            { user: event.user, claimed: false },
            { claimed: true }
          );
          
          this.logger.debug(`Updated rewards for user ${event.user} as claimed`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing RewardClaimed event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing RewardClaimed event: ${String(error)}`);
          }
        }
      });

      // DistributorAuthorized event
      contract.on('DistributorAuthorized', async (event: DistributorAuthorizedEvent) => {
        try {
          this.logger.debug(`Processing DistributorAuthorized event for distributor ${event.distributor}`);
          
          const existingDistributor = await this.distributorRepository.findOne({
            where: { address: event.distributor }
          });
          
          if (existingDistributor) {
            existingDistributor.authorized = true;
            await this.distributorRepository.save(existingDistributor);
          } else {
            const distributor = this.distributorRepository.create({
              address: event.distributor,
              authorized: true,
            });
            await this.distributorRepository.save(distributor);
          }
          
          this.logger.debug(`Updated distributor ${event.distributor} as authorized`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing DistributorAuthorized event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing DistributorAuthorized event: ${String(error)}`);
          }
        }
      });

      // DistributorRevoked event
      contract.on('DistributorRevoked', async (event: DistributorRevokedEvent) => {
        try {
          this.logger.debug(`Processing DistributorRevoked event for distributor ${event.distributor}`);
          
          await this.distributorRepository.update(
            { address: event.distributor },
            { authorized: false }
          );
          
          this.logger.debug(`Updated distributor ${event.distributor} as revoked`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing DistributorRevoked event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing DistributorRevoked event: ${String(error)}`);
          }
        }
      });
      
      this.logger.log('Successfully subscribed to Reward Distributor events');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to subscribe to Reward Distributor events: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to subscribe to Reward Distributor events: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async authorizeDistributor(dto: AuthorizeDistributorDto, privateKey: string) {
    try {
      this.logger.log(`Authorizing distributor ${dto.distributor}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'rewardDistributor',
        'authorize_distributor',
        [dto.distributor],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying authorizeDistributor transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying authorizeDistributor transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      // Update database (will also be updated by event listener, but this ensures immediate consistency)
      const existingDistributor = await this.distributorRepository.findOne({
        where: { address: dto.distributor }
      });
      
      if (existingDistributor) {
        existingDistributor.authorized = true;
        await this.distributorRepository.save(existingDistributor);
      } else {
        const distributor = this.distributorRepository.create({
          address: dto.distributor,
          authorized: true,
        });
        await this.distributorRepository.save(distributor);
      }
      
      this.logger.log(`Successfully authorized distributor ${dto.distributor}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        distributor: dto.distributor,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to authorize distributor ${dto.distributor}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to authorize distributor ${dto.distributor}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async revokeDistributor(dto: AuthorizeDistributorDto, privateKey: string) {
    try {
      this.logger.log(`Revoking distributor ${dto.distributor}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'rewardDistributor',
        'revoke_distributor',
        [dto.distributor],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying revokeDistributor transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying revokeDistributor transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      // Update database (will also be updated by event listener, but this ensures immediate consistency)
      await this.distributorRepository.update(
        { address: dto.distributor },
        { authorized: false }
      );
      
      this.logger.log(`Successfully revoked distributor ${dto.distributor}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        distributor: dto.distributor,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to revoke distributor ${dto.distributor}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to revoke distributor ${dto.distributor}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async distributeReward(dto: ExtendedDistributeRewardDto, privateKey: string) {
    try {
      this.logger.log(`Distributing reward to user ${dto.user}, amount: ${dto.amount}, reason: ${dto.reason || 'none'}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'rewardDistributor',
        'distribute_reward',
        [dto.user, dto.amount, dto.reason || ''],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying distributeReward transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying distributeReward transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully distributed reward to user ${dto.user}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        user: dto.user,
        amount: dto.amount,
        reason: dto.reason || '',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to distribute reward to user ${dto.user}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to distribute reward to user ${dto.user}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async batchDistributeRewards(rewards: ExtendedDistributeRewardDto[], privateKey: string) {
    try {
      this.logger.log(`Batch distributing rewards to ${rewards.length} users`);
      
      const users = rewards.map(r => r.user);
      const amounts = rewards.map(r => r.amount);
      const reasons = rewards.map(r => r.reason || '');
      
      const receipt = await this.transactionService.executeTransaction(
        'rewardDistributor',
        'batch_distribute_rewards',
        [users, amounts, reasons],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying batchDistributeRewards transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying batchDistributeRewards transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully batch distributed rewards to ${rewards.length} users, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        count: rewards.length,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to batch distribute rewards: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to batch distribute rewards: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async claimRewards(privateKey: string) {
    try {
      this.logger.log('Claiming rewards');
      
      const receipt = await this.transactionService.executeTransaction(
        'rewardDistributor',
        'claim_rewards',
        [],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying claimRewards transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying claimRewards transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      // Extract claimed amount from event logs
      let claimedAmount = '0';
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contractService.parseLog('rewardDistributor', log);
          if (parsedLog && parsedLog.name === 'RewardClaimed') {
            claimedAmount = parsedLog.args.amount.toString();
            break;
          }
        } catch (e: unknown) {
          // Skip logs that can't be parsed
        }
      }
      
      this.logger.log(`Successfully claimed rewards, amount: ${claimedAmount}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amount: claimedAmount,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to claim rewards: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to claim rewards: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getRewards(user: string) {
    try {
      this.logger.debug(`Getting rewards for user ${user}`);
      
      const rewards = await this.transactionService.executeCall(
        'rewardDistributor',
        'get_rewards',
        [user]
      );
      
      return rewards.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get rewards for user ${user}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get rewards for user ${user}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getTotalDistributed() {
    try {
      this.logger.debug('Getting total distributed rewards');
      
      const total = await this.transactionService.executeCall(
        'rewardDistributor',
        'get_total_distributed',
        []
      );
      
      return total.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get total distributed rewards: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get total distributed rewards: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async isAuthorizedDistributor(distributor: string) {
    try {
      this.logger.debug(`Checking if ${distributor} is an authorized distributor`);
      
      const isAuthorized = await this.transactionService.executeCall(
        'rewardDistributor',
        'is_authorized_distributor',
        [distributor]
      );
      
      return isAuthorized;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to check if ${distributor} is an authorized distributor: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to check if ${distributor} is an authorized distributor: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getUserRewards(user: string, includeHistory = false) {
    try {
      this.logger.debug(`Getting user rewards for ${user} from database, includeHistory: ${includeHistory}`);
      
      let query = this.rewardRepository.createQueryBuilder('reward')
        .where('reward.user = :user', { user });
      
      if (!includeHistory) {
        query = query.andWhere('reward.claimed = :claimed', { claimed: false });
      }
      
      const rewards = await query
        .orderBy('reward.timestamp', 'DESC')
        .getMany();
      
      // Get on-chain rewards as well
      let onChainRewards = '0';
      try {
        onChainRewards = await this.getRewards(user);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Failed to get on-chain rewards for user ${user}: ${errorMessage}`);
      }
      
      this.logger.debug(`Found ${rewards.length} rewards for user ${user}`);
      return {
        rewards,
        onChainRewards,
        totalUnclaimed: rewards
          .filter(r => !r.claimed)
          .reduce((sum, r) => sum + BigInt(r.amount), BigInt(0))
          .toString(),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get user rewards for ${user}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get user rewards for ${user}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getAuthorizedDistributors() {
    try {
      this.logger.debug('Getting authorized distributors from database');
      
      const distributors = await this.distributorRepository.find({
        where: { authorized: true }
      });
      
      this.logger.debug(`Found ${distributors.length} authorized distributors`);
      return distributors;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get authorized distributors: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get authorized distributors: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getRewardStats() {
    try {
      this.logger.debug('Getting reward statistics');
      
      // Get total distributed from contract
      const totalDistributed = await this.getTotalDistributed();
      
      // Get total claimed from database
      const totalClaimedResult = await this.rewardRepository
        .createQueryBuilder('reward')
        .select('SUM(reward.amount)', 'total')
        .where('reward.claimed = :claimed', { claimed: true })
        .getRawOne();
      
      const totalClaimed = totalClaimedResult?.total || '0';
      
      // Get total unclaimed from database
      const totalUnclaimedResult = await this.rewardRepository
        .createQueryBuilder('reward')
        .select('SUM(reward.amount)', 'total')
        .where('reward.claimed = :claimed', { claimed: false })
        .getRawOne();
      
      const totalUnclaimed = totalUnclaimedResult?.total || '0';
      
      // Get user count
      const userCount = await this.rewardRepository
        .createQueryBuilder('reward')
        .select('COUNT(DISTINCT reward.user)', 'count')
        .getRawOne();
      
      this.logger.debug('Successfully retrieved reward statistics');
      return {
        totalDistributed,
        totalClaimed,
        totalUnclaimed,
        userCount: userCount?.count || 0,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get reward statistics: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get reward statistics: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }
}