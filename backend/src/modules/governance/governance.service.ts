import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { CreateProposalDto } from '../../common/dtos/proposal.dto';

// Define interfaces for contract events
interface ProposalCreatedEvent {
  id: number;
  proposer: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
}

interface VoteCastEvent {
  proposalId: number;
  voter: string;
  votes: string;
  support: boolean;
  reason: string | null;
}

interface ProposalExecutedEvent {
  id: number;
}

interface ProposalCanceledEvent {
  id: number;
}

// Define type for parsed log (for parseLog method)
interface ParsedLog {
  name: string;
  args: {
    id: number;
    [key: string]: any;
  };
}

// Extend ContractService interface to include parseLog
interface ExtendedContractService extends ContractService {
  parseLog(contractName: string, log: any): ParsedLog | null;
}

@Injectable()
export class GovernanceService implements OnModuleInit {
  private readonly logger: AppLoggerService;

  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    private contractService: ExtendedContractService,
    private transactionService: TransactionService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(GovernanceService.name);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing Governance service');
      await this.subscribeToEvents();
      this.logger.log('Governance service initialized successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to initialize Governance service: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to initialize Governance service: ${String(error)}`);
      }
    }
  }

  private async subscribeToEvents() {
    try {
      this.logger.log('Subscribing to Governance events');
      const contract = await this.contractService.getContract('governance');

      // ProposalCreated event
      contract.on('ProposalCreated', async (event: ProposalCreatedEvent) => {
        try {
          this.logger.debug(`Processing ProposalCreated event for proposal ${event.id}`);
          
          const proposal = this.proposalRepository.create({
            id: event.id,
            proposer: event.proposer,
            title: event.title || 'Untitled Proposal',
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            forVotes: '0',
            againstVotes: '0',
            executed: false,
            canceled: false,
          });
          
          await this.proposalRepository.save(proposal);
          this.logger.debug(`Created new proposal with ID ${event.id}`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing ProposalCreated event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing ProposalCreated event: ${String(error)}`);
          }
        }
      });

      // VoteCast event
      contract.on('VoteCast', async (event: VoteCastEvent) => {
        try {
          this.logger.debug(`Processing VoteCast event for proposal ${event.proposalId} by ${event.voter}`);
          
          const vote = this.voteRepository.create({
            proposalId: event.proposalId,
            voter: event.voter,
            weight: event.votes.toString(),
            vote: event.support ? 'yes' : 'no',
            reason: event.reason || '',
          });
          
          await this.voteRepository.save(vote);
          this.logger.debug(`Saved vote for proposal ${event.proposalId} by ${event.voter}`);

          // Update proposal votes
          const proposal = await this.proposalRepository.findOne({ 
            where: { id: event.proposalId } 
          });
          
          if (proposal) {
            if (event.support) {
              proposal.forVotes = (BigInt(proposal.forVotes) + BigInt(event.votes)).toString();
            } else {
              proposal.againstVotes = (BigInt(proposal.againstVotes) + BigInt(event.votes)).toString();
            }
            
            await this.proposalRepository.save(proposal);
            this.logger.debug(`Updated vote counts for proposal ${event.proposalId}`);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing VoteCast event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing VoteCast event: ${String(error)}`);
          }
        }
      });

      // ProposalExecuted event
      contract.on('ProposalExecuted', async (event: ProposalExecutedEvent) => {
        try {
          this.logger.debug(`Processing ProposalExecuted event for proposal ${event.id}`);
          
          await this.proposalRepository.update(
            { id: event.id },
            { executed: true }
          );
          
          this.logger.debug(`Marked proposal ${event.id} as executed`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing ProposalExecuted event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing ProposalExecuted event: ${String(error)}`);
          }
        }
      });

      // ProposalCanceled event
      contract.on('ProposalCanceled', async (event: ProposalCanceledEvent) => {
        try {
          this.logger.debug(`Processing ProposalCanceled event for proposal ${event.id}`);
          
          await this.proposalRepository.update(
            { id: event.id },
            { canceled: true }
          );
          
          this.logger.debug(`Marked proposal ${event.id} as canceled`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error processing ProposalCanceled event: ${error.message}`, error.stack);
          } else {
            this.logger.error(`Error processing ProposalCanceled event: ${String(error)}`);
          }
        }
      });
      
      this.logger.log('Successfully subscribed to Governance events');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to subscribe to Governance events: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to subscribe to Governance events: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async createProposal(dto: CreateProposalDto, privateKey: string) {
    try {
      this.logger.log('Creating new proposal');
      
      // Construct arguments for the propose function
      const args: any[] = [
        dto.actions?.map(a => a.target) || [],
        dto.actions?.map(a => a.value) || [],
        dto.actions?.map(a => a.signature) || [],
        dto.actions?.map(a => a.calldata) || [],
        dto.description,
      ];
      
      const receipt = await this.transactionService.executeTransaction(
        'governance',
        'propose',
        args,
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying createProposal transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying createProposal transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      // Extract proposal ID from event logs
      let proposalId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contractService.parseLog('governance', log);
          if (parsedLog && parsedLog.name === 'ProposalCreated') {
            proposalId = parsedLog.args.id;
            break;
          }
        } catch (e: unknown) {
          // Skip logs that can't be parsed
        }
      }
      
      this.logger.log(`Successfully created proposal ${proposalId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        proposalId,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create proposal: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to create proposal: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async castVote(proposalId: number, support: boolean, privateKey: string, reason?: string) {
    try {
      this.logger.log(`Casting vote for proposal ${proposalId}, support: ${support}`);
      
      const methodName = reason ? 'castVoteWithReason' : 'castVote';
      const args: any[] = [proposalId, support];
      if (reason) {
        args.push(reason);
      }
      
      const receipt = await this.transactionService.executeTransaction(
        'governance',
        methodName,
        args,
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying castVote transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying castVote transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully cast vote for proposal ${proposalId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        proposalId,
        support,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to cast vote for proposal ${proposalId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to cast vote for proposal ${proposalId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async executeProposal(proposalId: number, privateKey: string) {
    try {
      this.logger.log(`Executing proposal ${proposalId}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'governance',
        'execute',
        [proposalId],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying executeProposal transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying executeProposal transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully executed proposal ${proposalId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        proposalId,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to execute proposal ${proposalId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to execute proposal ${proposalId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async cancelProposal(proposalId: number, privateKey: string) {
    try {
      this.logger.log(`Canceling proposal ${proposalId}`);
      
      const receipt = await this.transactionService.executeTransaction(
        'governance',
        'cancel',
        [proposalId],
        privateKey,
        {
          onRetry: (error: unknown, attempt: number) => {
            if (error instanceof Error) {
              this.logger.warn(`Retrying cancelProposal transaction (attempt ${attempt}): ${error.message}`);
            } else {
              this.logger.warn(`Retrying cancelProposal transaction (attempt ${attempt}): ${String(error)}`);
            }
          },
        }
      );
      
      this.logger.log(`Successfully canceled proposal ${proposalId}, transaction hash: ${receipt.transactionHash}`);
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        proposalId,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to cancel proposal ${proposalId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to cancel proposal ${proposalId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getProposal(id: number) {
    try {
      this.logger.debug(`Getting proposal ${id}`);
      return this.proposalRepository.findOne({ where: { id } });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get proposal ${id}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get proposal ${id}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getProposals(active = false, limit = 10, offset = 0) {
    try {
      this.logger.debug(`Getting proposals, active only: ${active}, limit: ${limit}, offset: ${offset}`);
      
      let query = this.proposalRepository.createQueryBuilder('proposal')
        .orderBy('proposal.createdAt', 'DESC')
        .skip(offset)
        .take(limit);
      
      if (active) {
        const now = Math.floor(Date.now() / 1000);
        query = query.where('proposal.startTime <= :now AND proposal.endTime >= :now', { now })
          .andWhere('proposal.canceled = :canceled', { canceled: false })
          .andWhere('proposal.executed = :executed', { executed: false });
      }
      
      const proposals = await query.getMany();
      
      this.logger.debug(`Found ${proposals.length} proposals`);
      return proposals;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get proposals: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get proposals: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getVotes(proposalId: number, support?: boolean) {
    try {
      this.logger.debug(`Getting votes for proposal ${proposalId}`);
      
      let query = this.voteRepository.createQueryBuilder('vote')
        .where('vote.proposalId = :proposalId', { proposalId })
        .orderBy('vote.timestamp', 'DESC');
      
      if (support !== undefined) {
        query = query.andWhere('vote.vote = :vote', { vote: support ? 'yes' : 'no' });
      }
      
      const votes = await query.getMany();
      
      this.logger.debug(`Found ${votes.length} votes for proposal ${proposalId}`);
      return votes;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get votes for proposal ${proposalId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get votes for proposal ${proposalId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getVotingPower(address: string) {
    try {
      this.logger.debug(`Getting voting power for address ${address}`);
      
      const votingPower = await this.transactionService.executeCall(
        'governance',
        'getVotingPower',
        [address]
      );
      
      return votingPower.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get voting power for address ${address}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get voting power for address ${address}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getProposalState(proposalId: number) {
    try {
      this.logger.debug(`Getting state for proposal ${proposalId}`);
      
      const state: number = await this.transactionService.executeCall(
        'governance',
        'state',
        [proposalId]
      );
      
      // Map numeric state to string representation
      const stateMap: { [key: number]: string } = {
        0: 'Pending',
        1: 'Active',
        2: 'Canceled',
        3: 'Defeated',
        4: 'Succeeded',
        5: 'Queued',
        6: 'Expired',
        7: 'Executed'
      };
      
      return {
        state,
        description: stateMap[state] || 'Unknown'
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get state for proposal ${proposalId}: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get state for proposal ${proposalId}: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getQuorum() {
    try {
      this.logger.debug('Getting governance quorum');
      
      const quorum = await this.transactionService.executeCall(
        'governance',
        'quorum',
        []
      );
      
      return quorum.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get governance quorum: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get governance quorum: ${String(error)}`);
        throw new Error(String(error));
      }
    }
  }

  async getProposalThreshold() {
    try {
      this.logger.debug('Getting proposal threshold');
      
      const threshold = await this.transactionService.executeCall(
        'governance',
        'proposalThreshold',
        []
      );
      
      return threshold.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get proposal threshold: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get proposal threshold: ${String(error)}`);
        throw new Error(`Failed to get proposal threshold: ${String(error)}`);
      }