import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { VoteDto } from './dto/vote.dto';
import { StarknetService } from '../blockchain/starknet.service';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../../common/services/logging.service';
import { MetricsGateway } from '../../common/gateways/metrics.gateway';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class GovernanceService {
  private readonly logger: AppLoggerService;
  private readonly proposalThreshold: bigint;
  private readonly votingPeriod: number;
  private readonly executionDelay: number;

  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    private starknetService: StarknetService,
    private configService: ConfigService,
    private metricsGateway: MetricsGateway,
    private redisService: RedisService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(GovernanceService.name);
    
    // Load governance parameters from config
    this.proposalThreshold = BigInt(this.configService.get('PROPOSAL_THRESHOLD', '100000000000000000000')); // Default: 100 tokens
    this.votingPeriod = parseInt(this.configService.get('VOTING_PERIOD', '259200'), 10); // Default: 3 days in seconds
    this.executionDelay = parseInt(this.configService.get('EXECUTION_DELAY', '86400'), 10); // Default: 1 day in seconds
    
    this.logger.log(`Governance initialized with proposal threshold: ${this.proposalThreshold}, voting period: ${this.votingPeriod}s, execution delay: ${this.executionDelay}s`);
  }

  async createProposal(userId: number, createProposalDto: CreateProposalDto): Promise<Proposal> {
    const { title, description, actions, walletAddress } = createProposalDto;
    
    // Check if user has enough tokens to create a proposal
    const balance = await this.starknetService.getGovernanceTokenBalance(walletAddress);
    
    if (balance < this.proposalThreshold) {
      throw new Error(`Insufficient governance tokens. Required: ${this.proposalThreshold}, Current: ${balance}`);
    }
    
    // Create proposal
    const proposal = this.proposalRepository.create({
      title,
      description,
      actions: JSON.stringify(actions),
      status: 'active',
      creatorId: userId,
      creatorAddress: walletAddress,
      startTime: new Date(),
      endTime: new Date(Date.now() + this.votingPeriod * 1000),
      yesVotes: '0',
      noVotes: '0',
      abstainVotes: '0',
    });
    
    const savedProposal = await this.proposalRepository.save(proposal);
    
    // Broadcast proposal creation
    this.metricsGateway.broadcastProposalUpdate(savedProposal.id.toString(), {
      proposalId: savedProposal.id.toString(),
      title: savedProposal.title,
      status: 'active',
      votesFor: parseInt(savedProposal.yesVotes),
      votesAgainst: parseInt(savedProposal.noVotes),
      votesAbstain: parseInt(savedProposal.abstainVotes),
      quorumPercentage: 0,
      lastUpdated: new Date()
    });
    
    return savedProposal;
  }

  async getProposals(active?: boolean, limit: number = 10, offset: number = 0): Promise<Proposal[]> {
    const cacheKey = `governance:proposals:${active ? 'active' : 'all'}:${limit}:${offset}`;
    
    // Try to get from cache
    const cachedProposals = await this.redisService.getJson<Proposal[]>(cacheKey);
    if (cachedProposals) {
      return cachedProposals;
    }
    
    // Get from database
    const where = active ? { status: 'active' } : {};
    const proposals = await this.proposalRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });
    
    // Cache for 1 minute
    await this.redisService.setJson(cacheKey, proposals, 60);
    
    return proposals;
  }

  async getProposal(id: number): Promise<Proposal> {
    const cacheKey = `governance:proposal:${id}`;
    
    // Try to get from cache
    const cachedProposal = await this.redisService.getJson<Proposal>(cacheKey);
    if (cachedProposal) {
      return cachedProposal;
    }
    
    const proposal = await this.proposalRepository.findOne({
      where: { id },
      relations: ['votes'],
    });
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }
    
    // Cache for 1 minute
    await this.redisService.setJson(cacheKey, proposal, 60);
    
    return proposal;
  }

  async vote(userId: number, proposalId: number, voteDto: VoteDto): Promise<Vote> {
    const { support, walletAddress } = voteDto;
    
    // Get proposal
    const proposal = await this.getProposal(proposalId);
    
    // Check if proposal is active
    if (proposal.status !== 'active') {
      throw new Error(`Proposal is not active. Current status: ${proposal.status}`);
    }
    
    // Check if voting period has ended
    if (new Date() > proposal.endTime) {
      throw new Error('Voting period has ended');
    }
    
    // Check if user has already voted
    const existingVote = await this.voteRepository.findOne({
      where: { proposalId, voterAddress: walletAddress },
    });
    
    if (existingVote) {
      throw new Error('You have already voted on this proposal');
    }
    
    // Get user's voting power
    const votingPower = await this.starknetService.getGovernanceTokenBalance(walletAddress);
    
    if (votingPower <= 0n) {
      throw new Error('You do not have any voting power');
    }
    
    // Create vote
    const vote = this.voteRepository.create({
      proposalId,
      voterId: userId,
      voterAddress: walletAddress,
      support,
      power: votingPower.toString(),
    });
    
    const savedVote = await this.voteRepository.save(vote);
    
    // Update proposal vote counts
    if (support === 'yes') {
      proposal.yesVotes = (BigInt(proposal.yesVotes) + votingPower).toString();
    } else if (support === 'no') {
      proposal.noVotes = (BigInt(proposal.noVotes) + votingPower).toString();
    } else {
      proposal.abstainVotes = (BigInt(proposal.abstainVotes) + votingPower).toString();
    }
    
    await this.proposalRepository.save(proposal);
    
    // Clear cache
    await this.redisService.del(`governance:proposal:${proposalId}`);
    
    // Broadcast vote
    this.metricsGateway.broadcastProposalUpdate(proposal.id.toString(), {
      proposalId: proposal.id.toString(),
      title: proposal.title,
      status: 'active',
      votesFor: parseInt(proposal.yesVotes),
      votesAgainst: parseInt(proposal.noVotes),
      votesAbstain: parseInt(proposal.abstainVotes),
      quorumPercentage: 0,
      lastUpdated: new Date()
    });
    
    return savedVote;
  }

  async executeProposal(proposalId: number): Promise<Proposal> {
    const proposal = await this.getProposal(proposalId);
    
    // Check if proposal is ready for execution
    if (proposal.status !== 'passed') {
      throw new Error(`Proposal is not passed. Current status: ${proposal.status}`);
    }
    
    // Check if execution delay has passed
    const executionTime = new Date(proposal.endTime.getTime() + this.executionDelay * 1000);
    if (new Date() < executionTime) {
      throw new Error(`Execution delay has not passed. Execution allowed after: ${executionTime.toISOString()}`);
    }
    
    try {
      // Parse actions
      const actions = JSON.parse(proposal.actions);
      
      // Execute each action
      for (const action of actions) {
        await this.starknetService.executeGovernanceAction(action);
      }
      
      // Update proposal status
      proposal.status = 'executed';
      proposal.executedAt = new Date();
      
      const updatedProposal = await this.proposalRepository.save(proposal);
      
      // Clear cache
      await this.redisService.del(`governance:proposal:${proposalId}`);
      await this.redisService.del('governance:proposals');
      
      // Broadcast update
      this.metricsGateway.broadcastProposalUpdate(proposal.id.toString(), {
        proposalId: proposal.id.toString(),
        title: proposal.title,
        status: 'executed',
        votesFor: parseInt(proposal.yesVotes),
        votesAgainst: parseInt(proposal.noVotes),
        votesAbstain: parseInt(proposal.abstainVotes),
        quorumPercentage: 100,
        lastUpdated: new Date(),
        executionStatus: 'completed'
      });
      
      return updatedProposal;
    } catch (error) {
      // Update proposal status to rejected
      proposal.status = 'rejected';
      proposal.executedAt = new Date();
      
      await this.proposalRepository.save(proposal);
      
      // Clear cache
      await this.redisService.del(`governance:proposal:${proposalId}`);
      await this.redisService.del('governance:proposals');
      
      // Broadcast update
      this.metricsGateway.broadcastProposalUpdate(proposal.id.toString(), {
        proposalId: proposal.id.toString(),
        title: proposal.title,
        status: 'rejected',
        votesFor: parseInt(proposal.yesVotes),
        votesAgainst: parseInt(proposal.noVotes),
        votesAbstain: parseInt(proposal.abstainVotes),
        quorumPercentage: 100,
        lastUpdated: new Date(),
        executionStatus: 'failed'
      });
      
      throw error;
    }
  }

  async processEndedProposals(): Promise<void> {
    const now = new Date();
    
    // Find all active proposals that have ended
    const endedProposals = await this.proposalRepository.find({
      where: {
        status: 'active',
        endTime: LessThan(now),
      },
    });
    
    for (const proposal of endedProposals) {
      // Calculate total votes
      const totalVotes = BigInt(proposal.yesVotes) + BigInt(proposal.noVotes) + BigInt(proposal.abstainVotes);
      
      // Get quorum from config (default 4% of total supply)
      const quorum = BigInt(this.configService.get('GOVERNANCE_QUORUM', '40000000000000000000000')); // Default: 40,000 tokens
      
      // Determine if proposal passed
      if (totalVotes >= quorum) {
        // Proposal passes if more yes votes than no votes
        if (BigInt(proposal.yesVotes) > BigInt(proposal.noVotes)) {
          proposal.status = 'passed';
        } else {
          proposal.status = 'rejected';
        }
      } else {
        proposal.status = 'rejected';
      }
      
      await this.proposalRepository.save(proposal);
      
      // Clear cache
      await this.redisService.del(`governance:proposal:${proposal.id}`);
      
      // Broadcast update
      this.metricsGateway.broadcastProposalUpdate(proposal.id.toString(), {
        proposalId: proposal.id.toString(),
        title: proposal.title,
        status: proposal.status === 'passed' ? 'passed' : 
               proposal.status === 'rejected' ? 'rejected' : 'cancelled',
        votesFor: parseInt(proposal.yesVotes),
        votesAgainst: parseInt(proposal.noVotes),
        votesAbstain: parseInt(proposal.abstainVotes),
        quorumPercentage: 100,
        lastUpdated: new Date()
      });
    }
    
    // Clear proposals cache if any proposals were updated
    if (endedProposals.length > 0) {
      await this.redisService.del('governance:proposals');
    }
  }

  async getProposalThreshold(): Promise<string> {
    try {
      return this.proposalThreshold.toString();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get proposal threshold: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to get proposal threshold: ${String(error)}`);
        throw new Error(`Failed to get proposal threshold: ${String(error)}`);
      }
    }
  }

  /**
   * Get votes for a specific proposal
   * @param proposalId Proposal ID
   * @param support Optional filter by vote support
   * @returns List of votes
   */
  async getVotes(proposalId: number, support?: boolean): Promise<Vote[]> {
    const cacheKey = `governance:votes:${proposalId}:${support !== undefined ? (support ? 'yes' : 'no') : 'all'}`;
    
    // Try to get from cache
    const cachedVotes = await this.redisService.getJson<Vote[]>(cacheKey);
    if (cachedVotes) {
      return cachedVotes;
    }
    
    // Build query
    const where: any = { proposalId };
    if (support !== undefined) {
      where.support = support ? 'yes' : 'no';
    }
    
    // Get from database
    const votes = await this.voteRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    
    // Cache for 1 minute
    await this.redisService.setJson(cacheKey, votes, 60);
    
    return votes;
  }

  /**
   * Cast a vote on a proposal
   * @param proposalId Proposal ID
   * @param support Vote support (true for yes, false for no)
   * @param walletAddress Voter's wallet address
   * @param reason Optional reason for the vote
   * @returns The created vote
   */
  // This method is not used - we use vote() instead
  private async castVote(proposalId: number, support: boolean, walletAddress: string, reason?: string): Promise<Vote> {
    // Get proposal
    const proposal = await this.getProposal(proposalId);
    
    // Check if proposal is active
    if (proposal.status !== 'active') {
      throw new Error(`Proposal is not active. Current status: ${proposal.status}`);
    }
    
    // Check if voting period has ended
    if (new Date() > proposal.endTime) {
      throw new Error('Voting period has ended');
    }
    
    // Check if user has already voted
    const existingVote = await this.voteRepository.findOne({
      where: { proposalId, voterAddress: walletAddress },
    });
    
    if (existingVote) {
      throw new Error('You have already voted on this proposal');
    }
    
    // Get user's voting power
    const votingPower = await this.starknetService.getGovernanceTokenBalance(walletAddress);
    
    if (votingPower <= 0n) {
      throw new Error('You do not have any voting power');
    }
    
    // Create vote
    const vote = this.voteRepository.create({
      proposalId,
      voterAddress: walletAddress,
      support: support ? 'yes' : 'no',
      power: votingPower.toString(),
    });
    
    const savedVote = await this.voteRepository.save(vote);
    
    // Update proposal vote counts
    if (support) {
      proposal.yesVotes = (BigInt(proposal.yesVotes) + votingPower).toString();
    } else {
      proposal.noVotes = (BigInt(proposal.noVotes) + votingPower).toString();
    }
    
    await this.proposalRepository.save(proposal);
    
    // Clear cache
    await this.redisService.del(`governance:proposal:${proposalId}`);
    await this.redisService.del(`governance:votes:${proposalId}:all`);
    await this.redisService.del(`governance:votes:${proposalId}:${support ? 'yes' : 'no'}`);
    
    // Broadcast vote
    this.metricsGateway.broadcastProposalUpdate(proposal.id.toString(), {
      proposalId: proposal.id.toString(),
      title: proposal.title,
      status: 'active',
      votesFor: parseInt(proposal.yesVotes),
      votesAgainst: parseInt(proposal.noVotes),
      votesAbstain: parseInt(proposal.abstainVotes),
      quorumPercentage: 0,
      lastUpdated: new Date()
    });
    
    return savedVote;
  }

  /**
   * Cancel a proposal
   * @param proposalId Proposal ID
   * @param walletAddress Wallet address of the canceller (must be admin or proposal creator)
   * @returns The updated proposal
   */
  async cancelProposal(proposalId: number): Promise<Proposal> {
    const proposal = await this.getProposal(proposalId);
    
    // Check if proposal can be cancelled
    if (proposal.status !== 'active' && proposal.status !== 'pending') {
      throw new Error(`Proposal cannot be cancelled. Current status: ${proposal.status}`);
    }
    
    // Update proposal status
    proposal.status = 'cancelled';
    
    const updatedProposal = await this.proposalRepository.save(proposal);
    
    // Clear cache
    await this.redisService.del(`governance:proposal:${proposalId}`);
    await this.redisService.del('governance:proposals');
    
    // Broadcast update
    this.metricsGateway.broadcastProposalUpdate(proposal.id.toString(), {
      proposalId: proposal.id.toString(),
      title: proposal.title,
      status: 'cancelled',
      votesFor: parseInt(proposal.yesVotes),
      votesAgainst: parseInt(proposal.noVotes),
      votesAbstain: parseInt(proposal.abstainVotes),
      quorumPercentage: 0,
      lastUpdated: new Date()
    });
    
    return updatedProposal;
  }
}