import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractService } from './contract.service';
import { AppLoggerService } from './logging.service';
import { ethers } from 'ethers';

/**
 * Gas price strategy
 */
export enum GasPriceStrategy {
  FASTEST = 'fastest',
  FAST = 'fast',
  AVERAGE = 'average',
  SLOW = 'slow',
  CUSTOM = 'custom',
}

/**
 * Gas price data
 */
export interface GasPriceData {
  strategy: GasPriceStrategy;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  baseFeePerGas?: string;
  estimatedTimeInSeconds?: number;
  type: number; // 0 = legacy, 2 = EIP-1559
}

/**
 * Gas optimization options
 */
export interface GasOptimizationOptions {
  strategy?: GasPriceStrategy;
  customGasPrice?: string;
  customMaxFeePerGas?: string;
  customMaxPriorityFeePerGas?: string;
  multiplier?: number;
  forceEIP1559?: boolean;
  forceLegacy?: boolean;
}

/**
 * Gas usage history entry
 */
interface GasUsageHistoryEntry {
  contractName: string;
  methodName: string;
  gasUsed: number;
  timestamp: number;
  transactionHash: string;
}

@Injectable()
export class GasOptimizerService {
  private readonly logger: AppLoggerService;
  private readonly defaultStrategy: GasPriceStrategy;
  private readonly defaultMultiplier: number;
  private readonly gasUsageHistory: Map<string, GasUsageHistoryEntry[]> = new Map();
  private readonly maxHistoryEntries: number;
  private readonly gasPriceCache: {
    timestamp: number;
    data: GasPriceData[];
  } = { timestamp: 0, data: [] };
  private readonly cacheTTL: number; // milliseconds

  constructor(
    private contractService: ContractService,
    private configService: ConfigService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(GasOptimizerService.name);
    this.defaultStrategy = this.configService.get<GasPriceStrategy>(
      'GAS_PRICE_STRATEGY',
      GasPriceStrategy.FAST,
    );
    this.defaultMultiplier = this.configService.get<number>('GAS_PRICE_MULTIPLIER', 1.1);
    this.maxHistoryEntries = this.configService.get<number>('GAS_HISTORY_MAX_ENTRIES', 10);
    this.cacheTTL = this.configService.get<number>('GAS_PRICE_CACHE_TTL', 30000); // 30 seconds
  }

  /**
   * Get optimal gas price based on the selected strategy
   * @param options Gas optimization options
   * @returns Gas price data
   */
  async getOptimalGasPrice(options: GasOptimizationOptions = {}): Promise<GasPriceData> {
    const strategy = options.strategy || this.defaultStrategy;
    const multiplier = options.multiplier || this.defaultMultiplier;
    
    // Check if we should use custom gas price
    if (strategy === GasPriceStrategy.CUSTOM) {
      if (options.customGasPrice) {
        // Legacy transaction
        return {
          strategy: GasPriceStrategy.CUSTOM,
          gasPrice: options.customGasPrice,
          type: 0,
        };
      } else if (options.customMaxFeePerGas && options.customMaxPriorityFeePerGas) {
        // EIP-1559 transaction
        return {
          strategy: GasPriceStrategy.CUSTOM,
          maxFeePerGas: options.customMaxFeePerGas,
          maxPriorityFeePerGas: options.customMaxPriorityFeePerGas,
          type: 2,
        };
      }
    }
    
    // Get gas price data from provider
    const gasPriceData = await this.getGasPriceData();
    
    // Find the gas price for the selected strategy
    const selectedGasPrice = gasPriceData.find(data => data.strategy === strategy) || 
                             gasPriceData.find(data => data.strategy === GasPriceStrategy.FAST);
    
    if (!selectedGasPrice) {
      throw new Error(`Could not find gas price for strategy: ${strategy}`);
    }
    
    // Apply multiplier
    if (multiplier !== 1) {
      if (selectedGasPrice.type === 2) {
        // EIP-1559 transaction
        if (selectedGasPrice.maxFeePerGas && selectedGasPrice.maxPriorityFeePerGas) {
          selectedGasPrice.maxFeePerGas = this.applyMultiplier(selectedGasPrice.maxFeePerGas, multiplier);
          selectedGasPrice.maxPriorityFeePerGas = this.applyMultiplier(selectedGasPrice.maxPriorityFeePerGas, multiplier);
        } else {
          throw new Error('Missing maxFeePerGas or maxPriorityFeePerGas for EIP-1559 transaction');
        }
      } else {
        // Legacy transaction
        if (selectedGasPrice.gasPrice) {
          selectedGasPrice.gasPrice = this.applyMultiplier(selectedGasPrice.gasPrice, multiplier);
        } else {
          throw new Error('Missing gasPrice for legacy transaction');
        }
      }
    }
    
    // Force EIP-1559 or legacy if requested
    if (options.forceEIP1559 && selectedGasPrice.type === 0) {
      // Convert legacy to EIP-1559
      if (selectedGasPrice.gasPrice) {
        const gasPrice = ethers.BigNumber.from(selectedGasPrice.gasPrice);
        const baseFee = await this.getBaseFeePerGas();
        
        selectedGasPrice.maxFeePerGas = gasPrice.toString();
        selectedGasPrice.maxPriorityFeePerGas = gasPrice.sub(baseFee).toString();
        selectedGasPrice.baseFeePerGas = baseFee.toString();
        selectedGasPrice.type = 2;
        delete selectedGasPrice.gasPrice;
      } else {
        throw new Error('Missing gasPrice for conversion to EIP-1559');
      }
    } else if (options.forceLegacy && selectedGasPrice.type === 2) {
      // Convert EIP-1559 to legacy
      if (selectedGasPrice.maxFeePerGas) {
        const maxFeePerGas = ethers.BigNumber.from(selectedGasPrice.maxFeePerGas);
        
        selectedGasPrice.gasPrice = maxFeePerGas.toString();
        selectedGasPrice.type = 0;
        delete selectedGasPrice.maxFeePerGas;
        delete selectedGasPrice.maxPriorityFeePerGas;
        delete selectedGasPrice.baseFeePerGas;
      } else {
        throw new Error('Missing maxFeePerGas for conversion to legacy');
      }
    }
    
    return selectedGasPrice;
  }

  /**
   * Get gas price data for all strategies
   * @returns Gas price data for all strategies
   */
  async getGasPriceData(): Promise<GasPriceData[]> {
    // Check if we have cached data
    const now = Date.now();
    if (this.gasPriceCache.timestamp > 0 && 
        now - this.gasPriceCache.timestamp < this.cacheTTL) {
      return this.gasPriceCache.data;
    }
    
    try {
      const provider = await this.contractService.getProvider(); // Assume getProvider returns Promise<ethers.providers.Provider>
      const result: GasPriceData[] = [];
      
      // Try to get fee data (EIP-1559)
      try {
        const feeData = await provider.getFeeData();
        
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // Network supports EIP-1559
          this.logger.debug('Using EIP-1559 fee structure');
          
          const baseFee = feeData.lastBaseFeePerGas || 
                          await this.getBaseFeePerGas();
          
          // Calculate different priority fees based on strategies
          const fastPriorityFee = feeData.maxPriorityFeePerGas;
          const avgPriorityFee = fastPriorityFee.mul(80).div(100); // 80% of fast
          const slowPriorityFee = fastPriorityFee.mul(50).div(100); // 50% of fast
          const fastestPriorityFee = fastPriorityFee.mul(150).div(100); // 150% of fast
          
          // Add strategies
          result.push({
            strategy: GasPriceStrategy.FASTEST,
            maxFeePerGas: baseFee.add(fastestPriorityFee).toString(),
            maxPriorityFeePerGas: fastestPriorityFee.toString(),
            baseFeePerGas: baseFee.toString(),
            estimatedTimeInSeconds: 15,
            type: 2,
          });
          
          result.push({
            strategy: GasPriceStrategy.FAST,
            maxFeePerGas: baseFee.add(fastPriorityFee).toString(),
            maxPriorityFeePerGas: fastPriorityFee.toString(),
            baseFeePerGas: baseFee.toString(),
            estimatedTimeInSeconds: 30,
            type: 2,
          });
          
          result.push({
            strategy: GasPriceStrategy.AVERAGE,
            maxFeePerGas: baseFee.add(avgPriorityFee).toString(),
            maxPriorityFeePerGas: avgPriorityFee.toString(),
            baseFeePerGas: baseFee.toString(),
            estimatedTimeInSeconds: 60,
            type: 2,
          });
          
          result.push({
            strategy: GasPriceStrategy.SLOW,
            maxFeePerGas: baseFee.add(slowPriorityFee).toString(),
            maxPriorityFeePerGas: slowPriorityFee.toString(),
            baseFeePerGas: baseFee.toString(),
            estimatedTimeInSeconds: 180,
            type: 2,
          });
          
          // Update cache
          this.gasPriceCache.data = result;
          this.gasPriceCache.timestamp = now;
          
          return result;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(`EIP-1559 fee data not available: ${errorMessage}`);
      }
      
      // Fall back to legacy gas price
      const gasPrice = await provider.getGasPrice();
      this.logger.debug('Using legacy fee structure');
      
      // Calculate different gas prices based on strategies
      const fastGasPrice = gasPrice;
      const avgGasPrice = fastGasPrice.mul(80).div(100); // 80% of fast
      const slowGasPrice = fastGasPrice.mul(50).div(100); // 50% of fast
      const fastestGasPrice = fastGasPrice.mul(150).div(100); // 150% of fast
      
      // Add strategies
      result.push({
        strategy: GasPriceStrategy.FASTEST,
        gasPrice: fastestGasPrice.toString(),
        estimatedTimeInSeconds: 15,
        type: 0,
      });
      
      result.push({
        strategy: GasPriceStrategy.FAST,
        gasPrice: fastGasPrice.toString(),
        estimatedTimeInSeconds: 30,
        type: 0,
      });
      
      result.push({
        strategy: GasPriceStrategy.AVERAGE,
        gasPrice: avgGasPrice.toString(),
        estimatedTimeInSeconds: 60,
        type: 0,
      });
      
      result.push({
        strategy: GasPriceStrategy.SLOW,
        gasPrice: slowGasPrice.toString(),
        estimatedTimeInSeconds: 180,
        type: 0,
      });
      
      // Update cache
      this.gasPriceCache.data = result;
      this.gasPriceCache.timestamp = now;
      
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error getting gas price data: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get the current base fee per gas
   * @returns Base fee per gas
   */
  async getBaseFeePerGas(): Promise<ethers.BigNumber> {
    try {
      const provider = await this.contractService.getProvider(); // Assume getProvider returns Promise<ethers.providers.Provider>
      
      // Get the latest block
      const block = await provider.getBlock('latest');
      
      if (block.baseFeePerGas) {
        return block.baseFeePerGas;
      }
      
      // If the block doesn't have a base fee, estimate it from the gas price
      const gasPrice = await provider.getGasPrice();
      return gasPrice.div(2); // Rough estimate
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error getting base fee per gas: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction based on historical data and current state
   * @param contractName Contract name
   * @param methodName Method name
   * @param args Method arguments
   * @param multiplier Safety multiplier
   * @returns Estimated gas limit
   */
  async estimateGasWithHistory(
    contractName: string,
    methodName: string,
    args: any[],
    multiplier = 1.2
  ): Promise<string> {
    try {
      const key = `${contractName}.${methodName}`;
      
      // Try to get historical data first
      const history = this.gasUsageHistory.get(key) || [];
      
      if (history.length > 0) {
        // Calculate average gas used from history
        const totalGas = history.reduce((sum, entry) => sum + entry.gasUsed, 0);
        const avgGas = Math.ceil(totalGas / history.length);
        
        // Apply multiplier for safety
        const estimatedGas = Math.ceil(avgGas * multiplier);
        
        this.logger.debug(`Using historical gas estimate for ${key}: ${estimatedGas} (avg: ${avgGas})`);
        
        return estimatedGas.toString();
      }
      
      // No history, estimate gas from contract
      const contract = await this.contractService.getContract(contractName); // Await the Promise
      const gasEstimate = await contract.estimateGas[methodName](...args);
      
      // Apply multiplier for safety
      const estimatedGas = Math.ceil(Number(gasEstimate) * multiplier);
      
      this.logger.debug(`Estimated gas for ${key}: ${estimatedGas}`);
      
      return estimatedGas.toString();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error estimating gas: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Record gas usage for a transaction
   * @param contractName Contract name
   * @param methodName Method name
   * @param gasUsed Gas used
   * @param transactionHash Transaction hash
   */
  recordGasUsage(
    contractName: string,
    methodName: string,
    gasUsed: number,
    transactionHash: string
  ): void {
    try {
      const key = `${contractName}.${methodName}`;
      
      // Get or create history array
      let history = this.gasUsageHistory.get(key) || [];
      
      // Add new entry
      history.push({
        contractName,
        methodName,
        gasUsed,
        timestamp: Date.now(),
        transactionHash,
      });
      
      // Limit history size
      if (history.length > this.maxHistoryEntries) {
        history = history.slice(-this.maxHistoryEntries);
      }
      
      // Update history
      this.gasUsageHistory.set(key, history);
      
      this.logger.debug(`Recorded gas usage for ${key}: ${gasUsed}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error recording gas usage: ${errorMessage}`, errorStack);
    }
  }

  /**
   * Get gas usage history for a method
   * @param contractName Contract name
   * @param methodName Method name
   * @returns Gas usage history
   */
  getGasUsageHistory(contractName: string, methodName: string): GasUsageHistoryEntry[] {
    const key = `${contractName}.${methodName}`;
    return this.gasUsageHistory.get(key) || [];
  }

  /**
   * Get gas usage statistics for a method
   * @param contractName Contract name
   * @param methodName Method name
   * @returns Gas usage statistics
   */
  getGasUsageStats(contractName: string, methodName: string): {
    min: number;
    max: number;
    avg: number;
    median: number;
    count: number;
  } {
    const history = this.getGasUsageHistory(contractName, methodName);
    
    if (history.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
    }
    
    const gasValues = history.map(entry => entry.gasUsed).sort((a, b) => a - b);
    const min = gasValues[0] ?? 0; // Fallback to 0 if undefined
    const max = gasValues[gasValues.length - 1] ?? 0; // Fallback to 0 if undefined
    const avg = Math.ceil(gasValues.reduce((sum, val) => sum + val, 0) / gasValues.length);
    const median = gasValues[Math.floor(gasValues.length / 2)] ?? 0; // Fallback to 0 if undefined
    
    return { min, max, avg, median, count: history.length };
  }

  /**
   * Apply a multiplier to a gas value
   * @param value Gas value as string
   * @param multiplier Multiplier
   * @returns New gas value as string
   */
  private applyMultiplier(value: string, multiplier: number): string {
    const bigValue = ethers.BigNumber.from(value);
    const multipliedValue = Math.ceil(Number(bigValue) * multiplier);
    return multipliedValue.toString();
  }
}