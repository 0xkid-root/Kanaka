import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';
import { AppConfigService } from './config.service';
import { AppLoggerService } from './logging.service';
import { ErrorHandlerService, BlockchainErrorType } from './error-handler.service';
import { TransactionMonitorService } from './transaction-monitor.service';
import { GasOptimizerService, GasPriceStrategy, GasOptimizationOptions } from './gas-optimizer.service';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { ethers } from 'ethers';

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

  async executeTransaction(
    contractName: string,
    methodName: string,
    args: any[],
    privateKey: string,
    options: TransactionOptions = {},
  ): Promise<any> {
    const opts = { ...this.defaultOptions, ...options };
    const maxRetries = opts.maxRetries ?? 3; // Default to 3 if undefined
    let attempt = 0;
    let lastError: Error | undefined; // Initialize as undefined

    const txContext = `${contractName}.${methodName}`;
    this.logger.log(`Preparing to execute transaction ${txContext}`);

    // Simulate the transaction first if not disabled
    if (!opts.skipSimulation) {
      await this.simulateTransaction(contractName, methodName, args, privateKey);
    }

    while (attempt <= maxRetries) {
      try {
        attempt++;
        this.logger.log(`Executing transaction ${txContext} (attempt ${attempt}/${maxRetries + 1})`);
        
        // Get the contract instance
        const contract = await this.contractService.getContractWithSigner(contractName, privateKey);
        
        // Estimate gas for the transaction
        let gasEstimate: string;
        try {
          if (opts.useGasHistory) {
            // Use historical gas data if available
            gasEstimate = await this.gasOptimizer.estimateGasWithHistory(
              contractName,
              methodName,
              args,
              opts.gasMultiplier ?? 1.2, // Default to 1.2 if undefined
            );
          } else {
            // Standard gas estimation
            const estimate = await contract.estimateGas[methodName](...args);
            gasEstimate = Math.floor(Number(estimate) * (opts.gasMultiplier ?? 1.2)).toString();
          }
        } catch (error: unknown) {
          // Handle gas estimation errors specifically
          const blockchainError = this.errorHandler.handleBlockchainError(error, `${txContext} gas estimation`);
          
          if (blockchainError.type === BlockchainErrorType.TRANSACTION_REVERTED) {
            this.logger.error(`Transaction would fail: ${blockchainError.message}`);
            throw blockchainError;
          }
          
          this.logger.warn(`Gas estimation failed: ${blockchainError.message}. Using fallback gas limit.`);
          gasEstimate = '1000000';
        }
        
        // Get optimal gas price based on strategy
        const gasOptimizationOptions: GasOptimizationOptions = {
          strategy: opts.gasPriceStrategy ?? GasPriceStrategy.FAST,
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
          txOptions.maxFeePerGas = gasPriceData.maxFeePerGas;
          txOptions.maxPriorityFeePerGas = gasPriceData.maxPriorityFeePerGas;
          this.logger.debug(`Using EIP-1559 gas price: maxFeePerGas=${gasPriceData.maxFeePerGas}, maxPriorityFeePerGas=${gasPriceData.maxPriorityFeePerGas}`);
        } else {
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
          from: await contract.signer.getAddress(),
          gasLimit: gasEstimate,
          gasPrice: gasPriceData,
          ...(opts.metadata || {}),
        };
        
        await this.transactionMonitor.trackTransaction(tx.hash, txContext, metadata);
        
        // Wait for the transaction to be mined with the specified confirmations
        const receipt = await tx.wait(opts.confirmations ?? 1);
        
        // Update transaction with receipt data
        const updatedTx = await this.transactionMonitor.getTransaction(tx.hash);
        if (updatedTx) {
          updatedTx.blockNumber = receipt.blockNumber;
          updatedTx.gasUsed = receipt.gasUsed.toString();
          updatedTx.effectiveGasPrice = receipt.effectiveGasPrice?.toString() ?? '0';
          await this.transactionMonitor.updateTransactionStatus(updatedTx);
        }
        
        // Record gas usage for future optimization
        this.gasOptimizer.recordGasUsage(
          contractName,
          methodName,
          receipt.gasUsed.toNumber(),
          receipt.transactionHash,
        );
        
        // Call onConfirmation callback if provided
        if (opts.onConfirmation) {
          opts.onConfirmation(opts.confirmations ?? 1, receipt);
        }
        
        this.logger.log(`Transaction ${txContext} confirmed: ${receipt.transactionHash}, gas used: ${receipt.gasUsed.toString()}`);
        
        return receipt;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Convert to structured blockchain error
        const blockchainError = this.errorHandler.handleBlockchainError(error, txContext);
        
        // Check if we should retry based on error type
        const shouldRetry = attempt <= maxRetries && this.errorHandler.isRetryable(blockchainError);
        
        if (shouldRetry) {
          // Call the onRetry callback if provided
          if (opts.onRetry) {
            opts.onRetry(lastError, attempt);
          }
          
          // Wait before retrying with exponential backoff
          const delay = (opts.retryDelay ?? 2000) * Math.pow(2, attempt - 1);
          this.logger.log(`Retrying in ${delay}ms... (${blockchainError.type})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.logger.error(`Transaction ${txContext} failed permanently: ${blockchainError.message}`);
          throw blockchainError;
        }
      }
    }
    
    // If we get here, all attempts failed
    const finalError = this.errorHandler.handleBlockchainError(lastError ?? new Error('Unknown error'), txContext);
    this.logger.error(`Transaction ${txContext} failed after ${maxRetries + 1} attempts: ${finalError.message}`);
    throw finalError;
  }

  async executeCall(
    contractName: string,
    methodName: string,
    args: any[] = [],
    options: TransactionOptions = {},
  ): Promise<any> {
    const opts = { ...this.defaultOptions, ...options };
    const maxRetries = opts.maxRetries ?? 3;
    let attempt = 0;
    let lastError: Error | undefined;

    const callContext = `${contractName}.${methodName}`;
    this.logger.debug(`Preparing to execute call ${callContext}`);

    while (attempt <= maxRetries) {
      try {
        attempt++;
        this.logger.debug(`Executing call ${callContext} (attempt ${attempt}/${maxRetries + 1})`);
        
        // Get the contract instance
        const contract = await this.contractService.getContract(contractName);
        
        // Execute the call
        const result = await contract[methodName](...args);
        
        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Convert to structured blockchain error
        const blockchainError = this.errorHandler.handleBlockchainError(error, callContext);
        
        // Check if we should retry based on error type
        const shouldRetry = attempt <= maxRetries && this.errorHandler.isRetryable(blockchainError);
        
        if (shouldRetry) {
          if (opts.onRetry) {
            opts.onRetry(lastError, attempt);
          }
          
          const delay = (opts.retryDelay ?? 2000) * Math.pow(2, attempt - 1);
          this.logger.debug(`Retrying call in ${delay}ms... (${blockchainError.type})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.logger.error(`Call ${callContext} failed permanently: ${blockchainError.message}`);
          throw blockchainError;
        }
      }
    }
    
    const finalError = this.errorHandler.handleBlockchainError(lastError ?? new Error('Unknown error'), callContext);
    this.logger.error(`Call ${callContext} failed after ${maxRetries + 1} attempts: ${finalError.message}`);
    throw finalError;
  }

  async waitForTransaction(
    txHash: string, 
    confirmations = 1,
    type = 'unknown',
    metadata: any = {},
  ): Promise<any> {
    try {
      this.logger.log(`Waiting for transaction ${txHash} to be confirmed (${confirmations} confirmations)...`);
      
      const existingTx = await this.transactionMonitor.getTransaction(txHash);
      if (!existingTx) {
        await this.transactionMonitor.trackTransaction(txHash, type, metadata);
      }
      
      const provider = await this.contractService.getProvider();
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      
      const updatedTx = await this.transactionMonitor.getTransaction(txHash);
      if (updatedTx) {
        updatedTx.blockNumber = receipt.blockNumber;
        updatedTx.gasUsed = receipt.gasUsed.toString();
        updatedTx.effectiveGasPrice = receipt.effectiveGasPrice?.toString() ?? '0';
        await this.transactionMonitor.updateTransactionStatus(updatedTx);
      }
      
      this.logger.log(`Transaction ${txHash} confirmed with ${confirmations} confirmations`);
      
      return receipt;
    } catch (error: unknown) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `waitForTransaction(${txHash})`,
      );
      this.logger.error(`Error waiting for transaction ${txHash}: ${blockchainError.message}`);
      
      const tx = await this.transactionMonitor.getTransaction(txHash);
      if (tx) {
        tx.status = TransactionStatus.FAILED;
        tx.error = blockchainError.message;
        await this.transactionMonitor.updateTransactionStatus(tx);
      }
      
      throw blockchainError;
    }
  }

  async getGasPrice(multiplier = 1.1): Promise<any> {
    return this.getOptimalGasPrice({ multiplier });
  }

  async getOptimalGasPrice(options: GasOptimizationOptions | number = {}): Promise<any> {
    try {
      const opts: GasOptimizationOptions = typeof options === 'number' 
        ? { multiplier: options } 
        : options;
      
      const gasPriceData = await this.gasOptimizer.getOptimalGasPrice(opts);
      
      if (gasPriceData.type === 2) {
        return {
          maxFeePerGas: gasPriceData.maxFeePerGas,
          maxPriorityFeePerGas: gasPriceData.maxPriorityFeePerGas,
          type: 2,
        };
      } else {
        return gasPriceData.gasPrice;
      }
    } catch (error: unknown) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `getOptimalGasPrice(${JSON.stringify(options)})`,
      );
      this.logger.error(`Error getting gas price: ${blockchainError.message}`);
      throw blockchainError;
    }
  }

  async estimateGas(
    contractName: string,
    methodName: string,
    args: any[],
    multiplier = 1.2,
  ): Promise<number> {
    try {
      this.logger.debug(`Estimating gas for ${contractName}.${methodName}`);
      
      const contract = await this.contractService.getContract(contractName);
      const gasEstimate = await contract.estimateGas[methodName](...args);
      
      return Math.floor(Number(gasEstimate) * multiplier);
    } catch (error: unknown) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `estimateGas(${contractName}.${methodName})`,
      );
      
      if (blockchainError.type === BlockchainErrorType.TRANSACTION_REVERTED) {
        this.logger.error(`Transaction would fail: ${blockchainError.message}`);
      } else {
        this.logger.error(`Error estimating gas: ${blockchainError.message}`);
      }
      
      throw blockchainError;
    }
  }

  async wouldSucceed(
    contractName: string,
    methodName: string,
    args: any[],
  ): Promise<boolean> {
    try {
      await this.estimateGas(contractName, methodName, args);
      return true;
    } catch (error: unknown) {
      return false;
    }
  }

  async getFailureReason(
    contractName: string,
    methodName: string,
    args: any[],
  ): Promise<string | null> {
    try {
      await this.estimateGas(contractName, methodName, args);
      return null;
    } catch (error: unknown) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `getFailureReason(${contractName}.${methodName})`,
      );
      
      return blockchainError.message;
    }
  }

  async simulateTransaction(
    contractName: string,
    methodName: string,
    args: any[],
    privateKey?: string,
  ): Promise<any> {
    const txContext = `${contractName}.${methodName}`;
    this.logger.log(`Simulating transaction ${txContext}`);
    
    try {
      const contract = privateKey 
        ? await this.contractService.getContractWithSigner(contractName, privateKey)
        : await this.contractService.getContract(contractName);
      
      const provider = await this.contractService.getProvider();
      const block = await provider.getBlock('latest');
      
      let from: string | undefined;
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey, provider);
        from = wallet.address;
      }
      
      const gasEstimate = await contract.estimateGas[methodName](...args);
      const txRequest = await contract.populateTransaction[methodName](...args);
      
      txRequest.gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      if (from) {
        txRequest.from = from;
      }
      
      const result = await provider.call(txRequest, block.number);
      
      this.logger.log(`Transaction ${txContext} simulation successful`);
      
      return {
        success: true,
        gasEstimate: gasEstimate.toString(),
        result,
      };
    } catch (error: unknown) {
      const blockchainError = this.errorHandler.handleBlockchainError(
        error, 
        `simulateTransaction(${txContext})`,
      );
      
      this.logger.error(`Transaction ${txContext} simulation failed: ${blockchainError.message}`);
      
      throw blockchainError;
    }
  }
}