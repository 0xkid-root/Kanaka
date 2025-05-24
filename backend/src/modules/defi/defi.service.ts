import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from './entities/pool.entity';
import { Transaction } from './entities/transaction.entity';
import { StarknetService } from '../../common/services/starknet.service';
import { MetricsGateway } from '../../common/gateways/metrics.gateway';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class DefiService {
  constructor(
    @InjectRepository(Pool)
    private poolRepository: Repository<Pool>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private starknetService: StarknetService,
    private metricsGateway: MetricsGateway,
    private redisService: RedisService,
  ) {}

  async getPool(id: number): Promise<Pool> {
    const pool = await this.poolRepository.findOne({ where: { id } });
    if (!pool) {
      throw new NotFoundException('Pool not found');
    }
    return pool;
  }

  async listPools(): Promise<Pool[]> {
    const cacheKey = 'pools:list';
    const cachedPools = await this.redisService.getJson<Pool[]>(cacheKey);
    
    if (cachedPools) {
      return cachedPools;
    }

    const pools = await this.poolRepository.find({
      order: { totalValue: 'DESC' },
    });

    await this.redisService.setJson(cacheKey, pools, 300); // Cache for 5 minutes
    return pools;
  }

  async deposit(
    userId: number,
    poolId: number,
    amount: number,
    walletAddress: string,
  ): Promise<Transaction> {
    const pool = await this.getPool(poolId);

    // Call Starknet contract
    const tx = await this.starknetService.deposit(
      walletAddress,
      amount,
      poolId.toString(),
    );

    // Create transaction record
    const transaction = this.transactionRepository.create({
      type: 'deposit',
      amount,
      status: 'pending',
      hash: tx.transaction_hash,
      pool,
      user: { id: userId },
    });

    await this.transactionRepository.save(transaction);

    // Update pool total value
    pool.totalValue = (BigInt(pool.totalValue) + BigInt(amount)).toString();
    await this.poolRepository.save(pool);

    // Broadcast update via WebSocket
    this.metricsGateway.broadcastPoolUpdate(poolId.toString(), {
      totalValue: pool.totalValue,
      lastUpdate: new Date(),
    });

    return transaction;
  }

  async withdraw(
    userId: number,
    poolId: number,
    amount: number,
    walletAddress: string,
  ): Promise<Transaction> {
    const pool = await this.getPool(poolId);

    // Call Starknet contract
    const tx = await this.starknetService.withdraw(
      walletAddress,
      amount,
      poolId.toString(),
    );

    // Create transaction record
    const transaction = this.transactionRepository.create({
      type: 'withdraw',
      amount,
      status: 'pending',
      hash: tx.transaction_hash,
      pool,
      user: { id: userId },
    });

    await this.transactionRepository.save(transaction);

    // Update pool total value
    pool.totalValue = (BigInt(pool.totalValue) - BigInt(amount)).toString();
    await this.poolRepository.save(pool);

    // Broadcast update via WebSocket
    this.metricsGateway.broadcastPoolUpdate(poolId.toString(), {
      totalValue: pool.totalValue,
      lastUpdate: new Date(),
    });

    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['pool', 'user'],
    });
  }

  async getUserPoolBalance(userId: number, poolId: number, walletAddress: string): Promise<bigint> {
    const pool = await this.getPool(poolId);
    return await this.starknetService.getUserBalance(walletAddress, poolId.toString());
  }

  async updateTransactionStatus(hash: string, status: 'completed' | 'failed'): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { hash },
      relations: ['pool', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = status;
    return await this.transactionRepository.save(transaction);
  }
}
