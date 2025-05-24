import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';
import { AppConfigService } from './config.service';
import { AppLoggerService } from './logging.service';
import { ErrorHandlerService, BlockchainErrorType } from './error-handler.service';
import { TransactionMonitorService } from './transaction-monitor.service';
import { GasOptimizerService, GasPriceStrategy, GasOptimizationOptions } from './gas-optimizer.service';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionMonitorService } from './transaction-monitor.service';

interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  gasMultiplier?: number;
  gasPriceMultiplier?: number;
  gasPriceStrategy?: GasPriceStrategy;
  customGasPrice?: string;
  customMaxFeePerGas?: string;
  customMaxPriorityFeePerGas?: string;
  forceEIP1559?: boolean;
  forceLegacy?: boolean;
  confirmations?: number;
  skipSimulation?: boolean;
  useGasHistory?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
  onConfirmation?: (confirmations: number, receipt: any) => void;
  metadata?: Record<string, any>;
}

@Injectable()
export class TransactionService {
  private readonly logger: AppLoggerService;
  private readonly defaultOptions: TransactionOptions;

  constructor(
    private contractService: ContractService,
    private configService: AppConfigService,
    private errorHandler: ErrorHandlerService,
    private transactionMonitor: TransactionMonitorService,
    private gasOptimizer: GasOptimizerService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(TransactionService.name);
    this.defaultOptions = {
      maxRetries: this.configService.get('TX_MAX_RETRIES', 3),
      retryDelay: this.configService.get('TX_RETRY_DELAY', 2000),
      gasMultiplier: this.configService.get('TX_GAS_MULTIPLIER', 1.2),
      gasPriceStrategy: this.configService.get('TX_GAS_PRICE_STRATEGY', GasPriceStrategy.FAST),
      confirmations: this.configService.get('TX_CONFIRMATIONS', 1),
      useGasHistory: this.configService.get('TX_USE_GAS_HISTORY', true),
    };
  }

  /**
   * Execute a contract transaction with retry logic and error handling
   * @param contractName Name of the contract
   * @param methodName Method to call on the contract
   * @param args Arguments to pass to the method
   * @param privateKey Private key to sign the transaction
   * @param options Transaction options
   * @returns Transaction receipt
   */
  async executeTransaction(
    contractName: string,
    methodName: string,
    args: any[],
    privateKey: string,
    options: TransactionOptions = {},
  ): Promise<any> {
    const opts = { ...this.defaultOptions, ...options };
    let attempt = 0;
    let lastError: Error;

    const txContext = `${contractName}.${methodName}`;
    this.logger.log(`Preparing to execute transaction ${txContext}`);

    // Simulate the transaction first if not disabled
    if (!opts.skipSimulation) {
      await this.simulateTransaction(contractName, methodName, args, privateKey);
    }

    while (attempt <= opts.maxRetries) {
      try {
        attempt++;
        this.logger.log(`Executing transaction ${txContext} (attempt ${attempt}/${opts.maxRetries + 1})`);
        
        // Get the contract instance
        const contract = this.contractService.getContractWithSigner(contractName, privateKey);
        
        // Estimate gas for the transaction
        let gasEstimate;
        try {
          if (opts.useGasHistory) {
            // Use historical gas data if available
            gasEstimate = await this.gasOptimizer.estimateGasWithHistory(
              contractName,
              methodName,
              args,
              opts.gasMultiplier
            );
          } else {
            // Standard gas estimation
            gasEstimate = await contract.estimateGas[methodName](...args);
            gasEstimate = Math.floor(Number(gasEstimate) * (opts.gasMultiplier || 1.2)).toString();
          }
        } catch (error) {
          // Handle gas estimation errors specifically
          const blockchainError = this.errorHandler.handleBlockchainError(error, `${txContext} gas estimation`);
          
          // If this is a revert, we can often get more information about why
          if (blockchainError.type === BlockchainErrorType.TRANSACTION_REVERTED) {
            this.logger.error(`Transaction would fail: ${blockchainError.message}`);
            throw blockchainError;
          }
          
          // For other errors, try to continue with a higher gas limit
          this.logger.warn(`Gas estimation failed: ${blockchainError.message}. Using fallback gas limit.`);
          // Use a high default gas limit as fallback
          gasEstimate = '1000000';
        }
        
        // Get optimal gas price based on strategy
        const gasOptimizationOptions: GasOptimizationOptions = {
          strategy: opts.gasPriceStrategy,
          multiplier: opts.gasPriceMultiplier,
          customGasPrice: opts.customGasPrice,
          customMaxFeePerGas: opts.customMaxFeePerGas,
          customMaxPriorityFeePerGas: opts.customMaxPriorityFeePerGas,
          forceEIP1559: opts.forceEIP1559,
          forceLegacy: opts.forceLegacy,
        };
        
        const gasPriceData = await this.gasOptimizer.getOptimalGasPrice(gasOptimizationOptions);
        
        // Prepare transaction options
        const txOptions: any = {
          gasLimit: gasEstimate,
        };
        
        // Set gas price based on type
        if (gasPriceData.type === 2) {
          // EIP-1559 transaction
          txOptions.maxFeePerGas = gasPriceData.maxFeePerGas;
          txOptions.maxPriorityFeePerGas = gasPriceData.maxPriorityFeePerGas;
          this.logger.debug(`Using EIP-1559 gas price: maxFeePerGas=${gasPriceData.maxFeePerGas}, maxPriorityFeePerGas=${gasPriceData.maxPriorityFeePerGas}`);
        } else {
          // Legacy transaction
          txOptions.gasPrice = gasPriceData.gasPrice;
          this.logger.debug(`Using legacy gas price: ${gasPriceData.gasPrice}`);
        }
        
        // Execute the transaction
        const tx = await contract[methodName](...args, txOptions);
        
        this.logger.log(`Transaction ${txContext} submitted: ${tx.hash}`);
        
        // Track the transaction in the monitoring service
        const metadata = {
          contractName,
          methodName,
          args,
          from: contract.signer.address,
          gasLimit: gasEstimate,
          gasPrice: gasPriceData,
          ...(opts.metadata || {}),
        };
        
        await this.transactionMonitor.trackTransaction(tx.hash, txContext, metadata);
        
        // Wait for the transaction to be mined with the specified confirmations
        const receipt = await tx.wait(opts.confirmations);
        
        // Update transaction with receipt data
        const updatedTx = await this.transactionMonitor.getTransaction(tx.hash);
        if (updatedTx) {
          updatedTx.blockNumber = receipt.blockNumber;
          updatedTx.gasUsed = receipt.gasUsed.toString();
          updatedTx.effectiveGasPrice = receipt.effectiveGasPrice.toString();
          await this.transactionMonitor.updateTransactionStatus(updatedTx);
        }
        
        // Record gas usage for future optimization
        this.gasOptimizer.recordGasUsage(
          contractName,
          methodName,
          receipt.gasUsed.toNumber(),
          receipt.transactionHash
        );
        
        // Call onConfirmation callback if provided
        if (opts.onConfirmation) {
          opts.onConfirmation(opts.confirmations, receipt);
        }
        
        this.logger.log(`Transaction ${txContext} confirmed: ${receipt.transactionHash}, gas used: ${receipt.gasUsed.toString()}`);
        
        return receipt;
      } catch (error) {
        lastError = error;
        
        // Convert to structured blockchain error
        const blockchainError = this.errorHandler.handleBlockchainError(error, txContext);
        
        // Check if we should retry based on error type
        const shouldRetry = attempt <= opts.maxRetries && this.errorHandler.isRetryable(blockchainError);
        
        if (shouldRetry) {
          // Call the onRetry callback if provided
          if (opts.onRetry) {
            opts.onRetry(error, attempt);
          }
          
          // Wait before retrying with exponential backoff
          const delay = opts.retryDelay * Math.pow(2, attempt - 1);
          this.logger.log(`Retrying in ${delay}ms... (${blockchainError.type})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // If we shouldn't retry, throw the error immediately
          this.logger.error(`Transaction ${txContext} failed permanently: ${blockchainError.message}`);
          throw blockchainError;
        }
      }
    }
    
    // If we get here, all attempts failed
    const finalError = this.errorHandler.handleBlockchainError(lastError, txContext);
    this.logger.error(`Transaction ${txContext} failed after ${opts.maxRetries + 1} attempts: ${finalError.message}`);
    throw finalError;
  }

  /**
   * Execute a read-only contract call with retry logic and error handling
   * @param contractName Name of the contract
   * @param methodName Method to call on the contract
   * @param args Arguments to pass to the method
   * @param options Transaction options
   * @returns Result of the call
   */
  async executeCall(
    contractName: string,
    methodName: string,
    args: any[] = [],
    options: TransactionOptions = {},
  ): Promise<any> {
    const opts = { ...this.defaultOptions, ...options };
    let attempt = 0;
    let lastError: Error;

    const callContext = `${contractName}.${methodName}`;
    this.logger.debug(`Preparing to execute call ${callContext}`);

    while (attempt <= opts.maxRetries) {
      try {
        attempt++;
        this.logger.debug(`Executing call ${callContext} (attempt ${attempt}/${opts.maxRetries + 1})`);
        
        // Get the contract instance
        const contract = this.contractService.getContract(contractName);
        
        // Execute the call
        const result = await contract[methodName](...args);
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Convert to structured blockchain error
        const blockchainError = this.errorHandler.handleBlockchainError(error, callContext);
        
        // Check if we should retry based on error type
        const shouldRetry = attempt <= opts.maxRetries && this.errorHandler.isRetryable(blockchainError);
        
        if (shouldRetry) {
          // Call the onRetry callback if provided
          if (opts.onRetry) {
            opts.onRetry(error, attempt);
          }
          
          // Wait before retrying with exponential backoff
          const delay = opts.retryDelay * Math.pow(2, attempt - 1);
          this.logger.debug(`Retrying call in ${delay}ms... (${blockchainError.type})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // If we shouldn't retry, throw the error immediately
          this.logger.error(`Call ${callContext} failed permanently: ${blockchainError.message}`);
          throw blockchainError;
        }
      }
    }
    
    // If we get here, all attempts failed
    const finalError = this.errorHandler.handleBlockchainError(lastError, callContext);
    this.logger.error(`Call ${callContext} failed after ${opts.maxRetries + 1} attempts: ${finalError.message}`);
    throw finalError;
  }

  /**
   * Wait for a transaction to be mined and confirmed
   * @param txHash Transaction hash
   * @param confirmations Number of confirmations to wait for
   * @param type Transaction type for monitoring
   * @param metadata Additional metadata for the transaction
   * @returns Transaction receipt
   */
  async waitForTransaction(
    txHash: string, 
    confirmations = 1,
    type = 'unknown',
    metadata: any = {}
  ): Promise<any> {
    try {
      this.logger.log(`Waiting for transaction ${txHash} to be confirmed (${confirmations} confirmations)...`);
      
      // Track the transaction if it's not already being tracked
      const existingTx = await this.transactionMonitor.getTransaction(txHash);
      if (!existingTx) {
        await this.transactionMonitor.trackTransaction(txHash, type, metadata);
      }
      
      const provider = this.contractService.getProvider();
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      
      // Update transaction with receipt data
      const updatedTx = await this.transactionMonitor.getTransaction(txHash);
      if (updatedTx) {
        updatedTx.blockNumber = receipt.blockNumber;
        updatedTx.gasUsed = receipt.gasUsed.toString();
        updatedTx.effectiveGasPrice = receipt.effectiveGasPrice.toString();
        await this.transactionMonitor.updateTransactionStatus(updatedTx);
      }
      
      this.logger.log(`Transaction ${txHash} confirmed with ${confirmations} confirmations`);
      
      return receipt;
    } catch (error) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `waitForTransaction(${txHash})`
      );
      this.logger.error(`Error waiting for transaction ${txHash}: ${blockchainError.message}`);
      
      // Update transaction status to failed
      const tx = await this.transactionMonitor.getTransaction(txHash);
      if (tx) {
        tx.status = TransactionStatus.FAILED;
        tx.error = blockchainError.message;
        await this.transactionMonitor.updateTransactionStatus(tx);
      }
      
      throw blockchainError;
    }
  }

  /**
   * Get the current gas price with a multiplier
   * @param multiplier Gas price multiplier
   * @returns Gas price
   * @deprecated Use getOptimalGasPrice instead
   */
  async getGasPrice(multiplier = 1.1): Promise<any> {
    return this.getOptimalGasPrice({ multiplier });
  }
  
  /**
   * Get the optimal gas price based on network conditions
   * @param options Gas optimization options or multiplier
   * @returns Optimal gas price
   */
  async getOptimalGasPrice(options: GasOptimizationOptions | number = {}): Promise<any> {
    try {
      // Convert number to options object if needed
      const opts: GasOptimizationOptions = typeof options === 'number' 
        ? { multiplier: options } 
        : options;
      
      // Get optimal gas price from gas optimizer
      const gasPriceData = await this.gasOptimizer.getOptimalGasPrice(opts);
      
      // Return in the format expected by ethers.js
      if (gasPriceData.type === 2) {
        // EIP-1559 transaction
        return {
          maxFeePerGas: gasPriceData.maxFeePerGas,
          maxPriorityFeePerGas: gasPriceData.maxPriorityFeePerGas,
          type: 2,
        };
      } else {
        // Legacy transaction
        return gasPriceData.gasPrice;
      }
    } catch (error) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `getOptimalGasPrice(${JSON.stringify(options)})`
      );
      this.logger.error(`Error getting gas price: ${blockchainError.message}`);
      throw blockchainError;
    }
  }
  
  /**
   * Estimate gas for a transaction
   * @param contractName Name of the contract
   * @param methodName Method to call on the contract
   * @param args Arguments to pass to the method
   * @param multiplier Gas multiplier for safety margin
   * @returns Estimated gas limit
   */
  async estimateGas(
    contractName: string,
    methodName: string,
    args: any[],
    multiplier = 1.2
  ): Promise<number> {
    try {
      this.logger.debug(`Estimating gas for ${contractName}.${methodName}`);
      
      const contract = this.contractService.getContract(contractName);
      const gasEstimate = await contract.estimateGas[methodName](...args);
      
      return Math.floor(Number(gasEstimate) * multiplier);
    } catch (error) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `estimateGas(${contractName}.${methodName})`
      );
      
      // If this is a revert, we can often get more information about why
      if (blockchainError.type === BlockchainErrorType.TRANSACTION_REVERTED) {
        this.logger.error(`Transaction would fail: ${blockchainError.message}`);
      } else {
        this.logger.error(`Error estimating gas: ${blockchainError.message}`);
      }
      
      throw blockchainError;
    }
  }
  
  /**
   * Check if a transaction would succeed
   * @param contractName Name of the contract
   * @param methodName Method to call on the contract
   * @param args Arguments to pass to the method
   * @returns True if the transaction would succeed
   */
  async wouldSucceed(
    contractName: string,
    methodName: string,
    args: any[]
  ): Promise<boolean> {
    try {
      await this.estimateGas(contractName, methodName, args);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the reason a transaction would fail
   * @param contractName Name of the contract
   * @param methodName Method to call on the contract
   * @param args Arguments to pass to the method
   * @returns Failure reason or null if it would succeed
   */
  async getFailureReason(
    contractName: string,
    methodName: string,
    args: any[]
  ): Promise<string | null> {
    try {
      await this.estimateGas(contractName, methodName, args);
      return null;
    } catch (error) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `getFailureReason(${contractName}.${methodName})`
      );
      
      return blockchainError.message;
    }
  }
  
  /**
   * Simulate a transaction to check if it would succeed
   * @param contractName Name of the contract
   * @param methodName Method to call on the contract
   * @param args Arguments to pass to the method
   * @param privateKey Private key to sign the transaction (optional)
   * @returns Simulation result
   */
  async simulateTransaction(
    contractName: string,
    methodName: string,
    args: any[],
    privateKey?: string
  ): Promise<any> {
    const txContext = `${contractName}.${methodName}`;
    this.logger.log(`Simulating transaction ${txContext}`);
    
    try {
      // Get the contract instance
      const contract = privateKey 
        ? this.contractService.getContractWithSigner(contractName, privateKey)
        : this.contractService.getContract(contractName);
      
      // Get the provider
      const provider = this.contractService.getProvider();
      
      // Get the latest block
      const block = await provider.getBlock('latest');
      
      // Get the from address if we have a private key
      let from = undefined;
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        from = wallet.address;
      }
      
      // Estimate gas for the transaction
      const gasEstimate = await contract.estimateGas[methodName](...args);
      
      // Create a transaction object
      const txRequest = await contract.populateTransaction[methodName](...args);
      
      // Add gas limit and from address
      txRequest.gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      if (from) {
        txRequest.from = from;
      }
      
      // Simulate the transaction
      const result = await provider.call(txRequest, block.number);
      
      this.logger.log(`Transaction ${txContext} simulation successful`);
      
      return {
        success: true,
        gasEstimate: gasEstimate.toString(),
        result,
      };
    } catch (error) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `simulateTransaction(${txContext})`
      );
      
      this.logger.error(`Transaction ${txContext} simulation failed: ${blockchainError.message}`);
      
      throw blockchainError;
    }
  }
}