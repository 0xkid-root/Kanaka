import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';

@Injectable()
export class StarknetService {
  constructor(private contractService: ContractService) {}

  // VaultManager functions
  async deposit(userAddress: string, amount: number, poolId: string) {
    return await this.contractService.execute('VaultManager', 'deposit', [
      poolId,
      amount,
    ]);
  }

  async withdraw(userAddress: string, amount: number, poolId: string) {
    return await this.contractService.execute('VaultManager', 'withdraw', [
      poolId,
      amount,
    ]);
  }

  async getUserBalance(userAddress: string, poolId: string) {
    return await this.contractService.callView('VaultManager', 'get_balance', [
      userAddress,
      poolId,
    ]);
  }

  // YieldEngine functions
  async rebalance(newWeights: number[]) {
    return await this.contractService.execute('YieldEngine', 'rebalance', [
      newWeights,
    ]);
  }

  async getPoolWeight(poolId: string) {
    return await this.contractService.callView('YieldEngine', 'get_pool_weight', [
      poolId,
    ]);
  }

  async harvestYield(poolId: string) {
    return await this.contractService.execute('YieldEngine', 'harvest_yield', [
      poolId,
    ]);
  }

  // CDROracle functions
  async updatePoolMetrics(poolId: string, amount: number, isDeposit: boolean) {
    return await this.contractService.execute('CDROracle', 'update_pool_metrics', [
      poolId,
      amount,
      isDeposit,
    ]);
  }

  async getPoolMetrics(poolId: string) {
    return await this.contractService.callView('CDROracle', 'get_pool_metrics', [
      poolId,
    ]);
  }

  async getPoolYield(poolId: string) {
    return await this.contractService.callView('CDROracle', 'get_pool_yield', [
      poolId,
    ]);
  }

  // StrategyRegistry functions
  async addPool(token: string, strategy: string, minDeposit: number, maxCapacity: number) {
    return await this.contractService.execute('StrategyRegistry', 'add_pool', [
      token,
      strategy,
      minDeposit,
      maxCapacity,
    ]);
  }

  async executeRebalance(newWeights: number[]) {
    return await this.contractService.execute('StrategyRegistry', 'execute_rebalance', [
      newWeights,
    ]);
  }

  async getPool(poolId: string) {
    return await this.contractService.callView('StrategyRegistry', 'get_pool', [
      poolId,
    ]);
  }

  async getPoolCount() {
    return await this.contractService.callView('StrategyRegistry', 'get_pool_count');
  }

  // Governance functions
  async createProposal(description: string) {
    return await this.contractService.execute('Governance', 'propose', [
      description,
    ]);
  }

  async castVote(proposalId: number, support: boolean) {
    return await this.contractService.execute('Governance', 'cast_vote', [
      proposalId,
      support,
    ]);
  }

  async executeProposal(proposalId: number) {
    return await this.contractService.execute('Governance', 'execute_proposal', [
      proposalId,
    ]);
  }

  async getProposal(proposalId: number) {
    return await this.contractService.callView('Governance', 'get_proposal', [
      proposalId,
    ]);
  }

  async getVote(proposalId: number, voter: string) {
    return await this.contractService.callView('Governance', 'get_vote', [
      proposalId,
      voter,
    ]);
  }

  // RewardDistributor functions
  async distributeReward(user: string, amount: number) {
    return await this.contractService.execute('RewardDistributor', 'distribute_reward', [
      user,
      amount,
    ]);
  }

  async claimRewards() {
    return await this.contractService.execute('RewardDistributor', 'claim_rewards', []);
  }

  async getRewards(user: string) {
    return await this.contractService.callView('RewardDistributor', 'get_rewards', [
      user,
    ]);
  }

  async getTotalDistributed() {
    return await this.contractService.callView('RewardDistributor', 'get_total_distributed');
  }

  // Transaction helpers
  async waitForTransaction(txHash: string) {
    return await this.contractService.waitForTransaction(txHash);
  }
}
