import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ContractService } from './contract.service';
import { AppConfigService } from './config.service';
import { AppLoggerService } from './logging.service';
import { ErrorHandlerService } from './error-handler.service';
import { EventEmitter } from 'events';

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: AppLoggerService;
  private eventEmitter = new EventEmitter();
  private listeners = new Map();
  private reconnectInterval: NodeJS.Timeout = setTimeout(() => {}, 0);
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;

  constructor(
    private contractService: ContractService,
    private configService: AppConfigService,
    private errorHandler: ErrorHandlerService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(EventListenerService.name);
    this.maxReconnectAttempts = this.configService.get('MAX_RECONNECT_ATTEMPTS', 10);
    this.reconnectDelay = this.configService.get('RECONNECT_DELAY', 5000);
    
    // Set a higher max listeners limit to avoid memory leak warnings
    this.eventEmitter.setMaxListeners(50);
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  /**
   * Connect to blockchain events and set up listeners
   */
  async connect() {
    try {
      this.logger.log('Connecting to blockchain events...');
      
      // Initialize all event listeners
      await this.setupEventListeners();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('Successfully connected to blockchain events');
      
      // Clear any existing reconnect interval
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = setTimeout(() => {}, 0);
      }
    } catch (error) {
      this.isConnected = false;
      const blockchainError = this.errorHandler.handleBlockchainError(error, 'event listener connection');
      this.logger.error(`Failed to connect to blockchain events: ${blockchainError.message}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from blockchain events and clean up listeners
   */
  disconnect() {
    this.logger.log('Disconnecting from blockchain events...');
    
    // Remove all listeners
    this.listeners.forEach((_listener, event) => {
      this.removeEventListener(event);
    });
    
    this.isConnected = false;
    
    // Clear any existing reconnect interval
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = setTimeout(() => {}, 0);
    }
    
    this.logger.log('Disconnected from blockchain events');
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) {
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.logger.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    this.logger.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectInterval = setTimeout(async () => {
      this.reconnectInterval = setTimeout(() => {}, 0);
      await this.connect();
    }, delay);
  }

  private async setupEventListeners() {
    // Setup listeners for all contracts
    await this.setupPoolEventListeners();
    await this.setupVaultEventListeners();
    await this.setupGovernanceEventListeners();
    await this.setupRewardEventListeners();
    await this.setupStrategyEventListeners();
  }

  private async setupPoolEventListeners() {
    try {
      const poolContract = this.contractService.getContract('pool');
      
      // Listen for deposit events
      this.addEventListener('PoolDeposit', poolContract, 'Deposit', async (from, amount, timestamp) => {
        this.logger.log(`Deposit event: ${from} deposited ${amount} at ${timestamp}`);
        this.eventEmitter.emit('PoolDeposit', { from, amount, timestamp });
      });
      
      // Listen for withdrawal events
      this.addEventListener('PoolWithdraw', poolContract, 'Withdraw', async (from, amount, timestamp) => {
        this.logger.log(`Withdraw event: ${from} withdrew ${amount} at ${timestamp}`);
        this.eventEmitter.emit('PoolWithdraw', { from, amount, timestamp });
      });
      
      // Listen for rebalance events
      this.addEventListener('PoolRebalance', poolContract, 'Rebalance', async (executor, oldWeights, newWeights, timestamp) => {
        this.logger.log(`Rebalance event: ${executor} rebalanced from ${oldWeights} to ${newWeights} at ${timestamp}`);
        this.eventEmitter.emit('PoolRebalance', { executor, oldWeights, newWeights, timestamp });
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to setup pool event listeners: ${err.message}`, err.stack);
      throw err;
    }
  }

  private async setupVaultEventListeners() {
    try {
      const vaultContract = this.contractService.getContract('vault');
      
      // Listen for deposit events
      this.addEventListener('VaultDeposit', vaultContract, 'Deposit', async (user, token, amount, shares) => {
        this.logger.log(`Vault Deposit event: ${user} deposited ${amount} of ${token} for ${shares} shares`);
        this.eventEmitter.emit('VaultDeposit', { user, token, amount, shares });
      });
      
      // Listen for withdrawal events
      this.addEventListener('VaultWithdraw', vaultContract, 'Withdraw', async (user, token, amount, shares) => {
        this.logger.log(`Vault Withdraw event: ${user} withdrew ${amount} of ${token} for ${shares} shares`);
        this.eventEmitter.emit('VaultWithdraw', { user, token, amount, shares });
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to setup vault event listeners: ${err.message}`, err.stack);
      throw err;
    }
  }

  private async setupGovernanceEventListeners() {
    try {
      const governanceContract = this.contractService.getContract('governance');
      
      // Listen for proposal created events
      this.addEventListener('ProposalCreated', governanceContract, 'ProposalCreated', async (id, proposer, description, startBlock, endBlock) => {
        this.logger.log(`Proposal Created event: ${proposer} created proposal ${id}: ${description}`);
        this.eventEmitter.emit('ProposalCreated', { id, proposer, description, startBlock, endBlock });
      });
      
      // Listen for vote cast events
      this.addEventListener('VoteCast', governanceContract, 'VoteCast', async (voter, proposalId, support, votes) => {
        this.logger.log(`Vote Cast event: ${voter} voted ${support ? 'for' : 'against'} proposal ${proposalId} with ${votes} votes`);
        this.eventEmitter.emit('VoteCast', { voter, proposalId, support, votes });
      });
      
      // Listen for proposal executed events
      this.addEventListener('ProposalExecuted', governanceContract, 'ProposalExecuted', async (id) => {
        this.logger.log(`Proposal Executed event: proposal ${id} was executed`);
        this.eventEmitter.emit('ProposalExecuted', { id });
      });
    } catch (error) {
      this.logger.error(`Failed to setup governance event listeners: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async setupRewardEventListeners() {
    try {
      const rewardContract = this.contractService.getContract('reward');
      
      // Listen for reward distributed events
      this.addEventListener('RewardDistributed', rewardContract, 'RewardDistributed', async (user, amount, timestamp) => {
        this.logger.log(`Reward Distributed event: ${user} received ${amount} at ${timestamp}`);
        this.eventEmitter.emit('RewardDistributed', { user, amount, timestamp });
      });
      
      // Listen for reward claimed events
      this.addEventListener('RewardClaimed', rewardContract, 'RewardClaimed', async (user, amount, timestamp) => {
        this.logger.log(`Reward Claimed event: ${user} claimed ${amount} at ${timestamp}`);
        this.eventEmitter.emit('RewardClaimed', { user, amount, timestamp });
      });
    } catch (error) {
      this.logger.error(`Failed to setup reward event listeners: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async setupStrategyEventListeners() {
    try {
      const strategyContract = this.contractService.getContract('strategy');
      
      // Listen for strategy executed events
      this.addEventListener('StrategyExecuted', strategyContract, 'StrategyExecuted', async (strategyId, executor, result, timestamp) => {
        this.logger.log(`Strategy Executed event: ${executor} executed strategy ${strategyId} with result ${result} at ${timestamp}`);
        this.eventEmitter.emit('StrategyExecuted', { strategyId, executor, result, timestamp });
      });
      
      // Listen for strategy added events
      this.addEventListener('StrategyAdded', strategyContract, 'StrategyAdded', async (strategyId, creator, params) => {
        this.logger.log(`Strategy Added event: ${creator} added strategy ${strategyId}`);
        this.eventEmitter.emit('StrategyAdded', { strategyId, creator, params });
      });
      
      // Listen for strategy updated events
      this.addEventListener('StrategyUpdated', strategyContract, 'StrategyUpdated', async (strategyId, updater, params) => {
        this.logger.log(`Strategy Updated event: ${updater} updated strategy ${strategyId}`);
        this.eventEmitter.emit('StrategyUpdated', { strategyId, updater, params });
      });
    } catch (error) {
      this.logger.error(`Failed to setup strategy event listeners: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add an event listener for a contract event
   * @param key Unique key for this listener
   * @param contract Contract to listen to
   * @param eventName Name of the event
   * @param callback Callback function to handle the event
   */
  private addEventListener(key: string, contract: any, eventName: string, callback: (...args: any[]) => void) {
    try {
      // Remove any existing listener for this event
      this.removeEventListener(key);
      
      // Add the new listener
      contract.on(eventName, async (...args: any[]) => {
        try {
          await callback(...args);
        } catch (error: unknown) {
          const err = error as Error;
          const blockchainError = this.errorHandler.handleBlockchainError(
            err, 
            `${eventName} event handler`
          );
          this.logger.error(`Error handling ${eventName} event: ${blockchainError.message}`);
        }
      });
      
      // Store the listener reference
      this.listeners.set(key, { contract, eventName });
      
      this.logger.log(`Added event listener for ${eventName}`);
    } catch (error) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `addEventListener(${eventName})`
      );
      this.logger.error(`Failed to add event listener for ${eventName}: ${blockchainError.message}`);
      throw blockchainError;
    }
  }

  /**
   * Remove an event listener
   * @param key Unique key for the listener to remove
   */
  private removeEventListener(key: string) {
    const listener = this.listeners.get(key);
    if (listener) {
      const { contract, eventName } = listener;
      try {
        contract.removeAllListeners(eventName);
        this.listeners.delete(key);
        this.logger.log(`Removed event listener for ${eventName}`);
      } catch (error) {
        const blockchainError = this.errorHandler.handleBlockchainError(
          error, 
          `removeEventListener(${eventName})`
        );
        this.logger.error(`Error removing event listener for ${eventName}: ${blockchainError.message}`);
      }
    }
  }

  /**
   * Subscribe to an event
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  public on(event: string, callback: (...args: any[]) => void) {
    this.logger.debug(`Adding subscriber for event: ${event}`);
    this.eventEmitter.on(event, callback);
    return () => this.eventEmitter.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param callback Callback function
   */
  public off(event: string, callback: (...args: any[]) => void) {
    this.logger.debug(`Removing subscriber for event: ${event}`);
    this.eventEmitter.off(event, callback);
  }

  /**
   * Check if the service is currently listening for events
   * @returns True if connected and listening
   */
  public isListening(): boolean {
    return this.isConnected;
  }
  
  /**
   * Emit an event manually (useful for testing)
   * @param event Event name
   * @param args Event arguments
   */
  public emit(event: string, ...args: any[]): void {
    this.logger.debug(`Manually emitting event: ${event}`);
    this.eventEmitter.emit(event, ...args);
  }
  
  /**
   * Get the number of listeners for an event
   * @param event Event name
   * @returns Number of listeners
   */
  public listenerCount(event: string): number {
    return this.eventEmitter.listenerCount(event);
  }
}