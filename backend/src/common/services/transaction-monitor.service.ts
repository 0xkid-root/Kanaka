import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContractService } from './contract.service';
import { AppLoggerService } from './logging.service';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Injectable()
export class TransactionMonitorService implements OnModuleInit {
  private readonly logger: AppLoggerService;
  private readonly monitorInterval: number;
  private readonly maxConfirmations: number;
  private readonly maxRetries: number;
  private monitoringActive = false;
  private monitoringTimer: NodeJS.Timeout;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private contractService: ContractService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(TransactionMonitorService.name);
    this.monitorInterval = this.configService.get<number>('TRANSACTION_MONITOR_INTERVAL', 15000); // 15 seconds
    this.maxConfirmations = this.configService.get<number>('TRANSACTION_MAX_CONFIRMATIONS', 12);
    this.maxRetries = this.configService.get<number>('TRANSACTION_MAX_RETRIES', 5);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing transaction monitoring service');
      await this.startMonitoring();
      this.logger.log('Transaction monitoring service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize transaction monitoring service: ${error.message}`, error.stack);
    }
  }

  async startMonitoring() {
    if (this.monitoringActive) {
      this.logger.warn('Transaction monitoring is already active');
      return;
    }

    this.monitoringActive = true;
    this.logger.log(`Starting transaction monitoring with interval: ${this.monitorInterval}ms`);
    
    // Immediately check for pending transactions
    await this.checkPendingTransactions();
    
    // Set up interval for continuous monitoring
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.checkPendingTransactions();
      } catch (error) {
        this.logger.error(`Error in transaction monitoring: ${error.message}`, error.stack);
      }
    }, this.monitorInterval);
  }

  stopMonitoring() {
    if (!this.monitoringActive) {
      return;
    }

    this.logger.log('Stopping transaction monitoring');
    clearInterval(this.monitoringTimer);
    this.monitoringActive = false;
  }

  async trackTransaction(hash: string, type: string, metadata: any = {}) {
    try {
      this.logger.debug(`Tracking new transaction: ${hash}, type: ${type}`);
      
      // Check if transaction already exists
      const existingTransaction = await this.transactionRepository.findOne({
        where: { hash }
      });
      
      if (existingTransaction) {
        this.logger.debug(`Transaction ${hash} is already being tracked`);
        return existingTransaction;
      }
      
      // Create new transaction record
      const transaction = this.transactionRepository.create({
        hash,
        type,
        status: TransactionStatus.PENDING,
        confirmations: 0,
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await this.transactionRepository.save(transaction);
      this.logger.debug(`Started tracking transaction ${hash}`);
      
      // Emit event for new transaction
      this.eventEmitter.emit('transaction.new', transaction);
      
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to track transaction ${hash}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkPendingTransactions() {
    try {
      const pendingTransactions = await this.transactionRepository.find({
        where: [
          { status: TransactionStatus.PENDING },
          { status: TransactionStatus.CONFIRMING }
        ]
      });
      
      if (pendingTransactions.length === 0) {
        return;
      }
      
      this.logger.debug(`Checking ${pendingTransactions.length} pending transactions`);
      
      for (const transaction of pendingTransactions) {
        await this.updateTransactionStatus(transaction);
      }
    } catch (error) {
      this.logger.error(`Failed to check pending transactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateTransactionStatus(transaction: Transaction) {
    try {
      // Get transaction receipt
      const receipt = await this.contractService.getTransactionReceipt(transaction.hash);
      
      if (!receipt) {
        // Transaction not yet mined
        transaction.retryCount = (transaction.retryCount || 0) + 1;
        
        if (transaction.retryCount > this.maxRetries) {
          transaction.status = TransactionStatus.FAILED;
          transaction.error = 'Transaction not found after maximum retries';
          this.logger.warn(`Transaction ${transaction.hash} not found after ${this.maxRetries} retries, marking as failed`);
          this.eventEmitter.emit('transaction.failed', transaction);
        }
        
        await this.transactionRepository.save(transaction);
        return;
      }
      
      // Get current block number
      const currentBlock = await this.contractService.getCurrentBlockNumber();
      
      // Calculate confirmations
      const confirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber + 1 : 0;
      transaction.confirmations = confirmations;
      
      // Update transaction status based on receipt
      if (receipt.status === 1) {
        // Transaction successful
        if (confirmations >= this.maxConfirmations) {
          transaction.status = TransactionStatus.CONFIRMED;
          this.logger.debug(`Transaction ${transaction.hash} confirmed with ${confirmations} confirmations`);
          this.eventEmitter.emit('transaction.confirmed', transaction);
        } else {
          transaction.status = TransactionStatus.CONFIRMING;
          this.logger.debug(`Transaction ${transaction.hash} is confirming with ${confirmations}/${this.maxConfirmations} confirmations`);
          this.eventEmitter.emit('transaction.confirming', transaction, confirmations);
        }
      } else {
        // Transaction failed
        transaction.status = TransactionStatus.FAILED;
        transaction.error = 'Transaction execution failed';
        this.logger.warn(`Transaction ${transaction.hash} failed on-chain`);
        this.eventEmitter.emit('transaction.failed', transaction);
      }
      
      // Save updated transaction
      transaction.updatedAt = new Date();
      await this.transactionRepository.save(transaction);
    } catch (error) {
      this.logger.error(`Failed to update transaction ${transaction.hash}: ${error.message}`, error.stack);
      
      // Mark as failed after too many errors
      transaction.retryCount = (transaction.retryCount || 0) + 1;
      if (transaction.retryCount > this.maxRetries) {
        transaction.status = TransactionStatus.FAILED;
        transaction.error = `Error updating status: ${error.message}`;
        this.eventEmitter.emit('transaction.failed', transaction);
      }
      
      await this.transactionRepository.save(transaction);
    }
  }

  async getTransaction(hash: string) {
    return this.transactionRepository.findOne({ where: { hash } });
  }

  async getTransactionsByAddress(address: string, limit = 20, offset = 0) {
    // Find transactions where the address is in the metadata
    return this.transactionRepository.createQueryBuilder('transaction')
      .where(`transaction.metadata::jsonb @> '{"from": "${address}"}'`)
      .orWhere(`transaction.metadata::jsonb @> '{"to": "${address}"}'`)
      .orderBy('transaction.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  async getTransactionsByType(type: string, limit = 20, offset = 0) {
    return this.transactionRepository.find({
      where: { type },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  async getTransactionStats() {
    const totalCount = await this.transactionRepository.count();
    const pendingCount = await this.transactionRepository.count({
      where: { status: TransactionStatus.PENDING }
    });
    const confirmingCount = await this.transactionRepository.count({
      where: { status: TransactionStatus.CONFIRMING }
    });
    const confirmedCount = await this.transactionRepository.count({
      where: { status: TransactionStatus.CONFIRMED }
    });
    const failedCount = await this.transactionRepository.count({
      where: { status: TransactionStatus.FAILED }
    });
    
    return {
      total: totalCount,
      pending: pendingCount,
      confirming: confirmingCount,
      confirmed: confirmedCount,
      failed: failedCount,
    };
  }
}