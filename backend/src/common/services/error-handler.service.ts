import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AppLoggerService } from './logging.service';

/**
 * Error types for blockchain operations
 */
export enum BlockchainErrorType {
  // Transaction errors
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED',
  TRANSACTION_REPLACED = 'TRANSACTION_REPLACED',
  TRANSACTION_UNDERPRICED = 'TRANSACTION_UNDERPRICED',
  TRANSACTION_OUT_OF_GAS = 'TRANSACTION_OUT_OF_GAS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NONCE_EXPIRED = 'NONCE_EXPIRED',
  NONCE_TOO_LOW = 'NONCE_TOO_LOW',
  NONCE_TOO_HIGH = 'NONCE_TOO_HIGH',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNPREDICTABLE_GAS = 'UNPREDICTABLE_GAS',
  
  // Contract errors
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  CONTRACT_NOT_DEPLOYED = 'CONTRACT_NOT_DEPLOYED',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  MISSING_ARGUMENT = 'MISSING_ARGUMENT',
  
  // User errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  REJECTED_BY_USER = 'REJECTED_BY_USER',
  
  // Chain errors
  CHAIN_DISCONNECTED = 'CHAIN_DISCONNECTED',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  
  // Other errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured blockchain error
 */
export interface BlockchainError {
  type: BlockchainErrorType;
  message: string;
  code?: string;
  data?: any;
  originalError?: Error;
  context: string;
  timestamp: Date;
  transactionHash?: string;
  retryable: boolean;
  userFriendlyMessage?: string;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger: AppLoggerService;

  constructor(loggerService: AppLoggerService) {
    this.logger = loggerService.createLogger(ErrorHandlerService.name);
  }

  /**
   * Handle blockchain errors and convert them to structured errors
   * @param error Original error
   * @param context Additional context
   * @param transactionHash Optional transaction hash
   * @returns Structured blockchain error
   */
  handleBlockchainError(error: any, context?: string, transactionHash?: string): BlockchainError {
    this.logger.error(`Blockchain error${context ? ` in ${context}` : ''}: ${error.message}`, error.stack);
    
    // Extract transaction hash from error if available and not provided
    if (!transactionHash && error.transaction?.hash) {
      transactionHash = error.transaction.hash;
    } else if (!transactionHash && error.hash) {
      transactionHash = error.hash;
    }
    
    // Default error
    const blockchainError: BlockchainError = {
      type: BlockchainErrorType.UNKNOWN_ERROR,
      message: error.message || 'Unknown blockchain error',
      originalError: error,
      context,
      timestamp: new Date(),
      transactionHash,
      retryable: false,
    };
    
    // Check for ethers.js errors
    if (error.code) {
      blockchainError.code = error.code;
      
      switch (error.code) {
        // Transaction errors
        case 'CALL_EXCEPTION':
          blockchainError.type = BlockchainErrorType.TRANSACTION_REVERTED;
          blockchainError.message = 'Transaction reverted: ' + (error.reason || error.message);
          blockchainError.data = error.data;
          blockchainError.retryable = false;
          break;
          
        case 'UNPREDICTABLE_GAS_LIMIT':
          blockchainError.type = BlockchainErrorType.UNPREDICTABLE_GAS;
          blockchainError.message = 'Cannot estimate gas: ' + (error.reason || error.message);
          blockchainError.data = error.data;
          blockchainError.retryable = false;
          break;
          
        case 'REPLACEMENT_UNDERPRICED':
          blockchainError.type = BlockchainErrorType.TRANSACTION_UNDERPRICED;
          blockchainError.message = 'Transaction replacement underpriced';
          blockchainError.retryable = true;
          break;
          
        case 'TRANSACTION_REPLACED':
          blockchainError.type = BlockchainErrorType.TRANSACTION_REPLACED;
          blockchainError.message = `Transaction was replaced: ${error.reason || ''}`;
          blockchainError.data = {
            hash: error.hash,
            replacement: error.replacement,
            reason: error.reason,
          };
          // Only retry if the transaction was cancelled, not if it was replaced or repriced
          blockchainError.retryable = error.reason === 'cancelled';
          break;
          
        case 'INSUFFICIENT_FUNDS':
          blockchainError.type = BlockchainErrorType.INSUFFICIENT_FUNDS;
          blockchainError.message = 'Insufficient funds for transaction';
          blockchainError.retryable = false;
          break;
          
        case 'NONCE_EXPIRED':
          blockchainError.type = BlockchainErrorType.NONCE_EXPIRED;
          blockchainError.message = 'Nonce has already been used';
          blockchainError.retryable = true;
          break;
          
        case 'INVALID_ARGUMENT':
          blockchainError.type = BlockchainErrorType.INVALID_ARGUMENT;
          blockchainError.message = 'Invalid argument: ' + error.argument;
          blockchainError.data = { argument: error.argument, value: error.value };
          blockchainError.retryable = false;
          break;
          
        case 'MISSING_ARGUMENT':
          blockchainError.type = BlockchainErrorType.MISSING_ARGUMENT;
          blockchainError.message = 'Missing argument: ' + error.argument;
          blockchainError.data = { argument: error.argument };
          blockchainError.retryable = false;
          break;
          
        case 'UNSUPPORTED_OPERATION':
          blockchainError.type = BlockchainErrorType.UNSUPPORTED_OPERATION;
          blockchainError.message = 'Unsupported operation: ' + error.message;
          blockchainError.retryable = false;
          break;
          
        // Network errors
        case 'NETWORK_ERROR':
        case 'SERVER_ERROR':
        case 'CONNECTION_ERROR':
          blockchainError.type = BlockchainErrorType.NETWORK_ERROR;
          blockchainError.message = 'Network error: ' + error.message;
          blockchainError.retryable = true;
          break;
          
        case 'TIMEOUT':
          blockchainError.type = BlockchainErrorType.TIMEOUT;
          blockchainError.message = 'Operation timed out';
          blockchainError.retryable = true;
          break;
          
        case 'UNKNOWN_ERROR':
        default:
          // Check for specific error messages
          if (error.message) {
            if (error.message.includes('gas required exceeds allowance') || 
                error.message.includes('out of gas')) {
              blockchainError.type = BlockchainErrorType.TRANSACTION_OUT_OF_GAS;
              blockchainError.message = 'Transaction ran out of gas';
              blockchainError.retryable = true;
            } else if (error.message.includes('execution reverted')) {
              blockchainError.type = BlockchainErrorType.TRANSACTION_REVERTED;
              blockchainError.message = 'Transaction reverted: ' + this.extractRevertReason(error);
              blockchainError.retryable = false;
            } else if (error.message.includes('rate limit')) {
              blockchainError.type = BlockchainErrorType.RATE_LIMIT;
              blockchainError.message = 'Rate limit exceeded';
              blockchainError.retryable = true;
            } else if (error.message.includes('nonce too low')) {
              blockchainError.type = BlockchainErrorType.NONCE_TOO_LOW;
              blockchainError.message = 'Nonce too low';
              blockchainError.retryable = true;
            } else if (error.message.includes('nonce too high')) {
              blockchainError.type = BlockchainErrorType.NONCE_TOO_HIGH;
              blockchainError.message = 'Nonce too high';
              blockchainError.retryable = true;
            } else if (error.message.includes('user rejected') || error.message.includes('user denied')) {
              blockchainError.type = BlockchainErrorType.REJECTED_BY_USER;
              blockchainError.message = 'Transaction rejected by user';
              blockchainError.retryable = false;
            } else if (error.message.includes('contract not deployed')) {
              blockchainError.type = BlockchainErrorType.CONTRACT_NOT_DEPLOYED;
              blockchainError.message = 'Contract not deployed';
              blockchainError.retryable = false;
            } else if (error.message.includes('disconnected') || error.message.includes('not connected')) {
              blockchainError.type = BlockchainErrorType.CHAIN_DISCONNECTED;
              blockchainError.message = 'Chain disconnected';
              blockchainError.retryable = true;
            }
          }
          break;
      }
    }
    
    // Add user-friendly message
    blockchainError.userFriendlyMessage = this.getUserFriendlyMessage(blockchainError);
    
    return blockchainError;
  }
  
  /**
   * Extract revert reason from error
   * @param error Error object
   * @returns Extracted revert reason or empty string
   */
  private extractRevertReason(error: any): string {
    // Try to extract reason from error data
    if (error.data) {
      try {
        // Some providers return the revert reason in the error data
        return error.data.message || error.data;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Try to extract from error message
    const revertMatch = error.message.match(/reverted with reason string '(.+?)'/);
    if (revertMatch && revertMatch[1]) {
      return revertMatch[1];
    }
    
    // Try to extract from error message (alternative format)
    const revertMatch2 = error.message.match(/reverted: (.+?)(?:$|\\n)/);
    if (revertMatch2 && revertMatch2[1]) {
      return revertMatch2[1];
    }
    
    return error.reason || '';
  }

  /**
   * Convert a blockchain error to an HTTP exception
   * @param error Blockchain error
   * @returns HTTP exception
   */
  toHttpException(error: BlockchainError): HttpException {
    let status: HttpStatus;
    
    switch (error.type) {
      case BlockchainErrorType.UNAUTHORIZED:
        status = HttpStatus.UNAUTHORIZED;
        break;
        
      case BlockchainErrorType.INVALID_ARGUMENT:
        status = HttpStatus.BAD_REQUEST;
        break;
        
      case BlockchainErrorType.RATE_LIMIT:
        status = HttpStatus.TOO_MANY_REQUESTS;
        break;
        
      case BlockchainErrorType.NETWORK_ERROR:
      case BlockchainErrorType.TIMEOUT:
        status = HttpStatus.SERVICE_UNAVAILABLE;
        break;
        
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        break;
    }
    
    return new HttpException({
      statusCode: status,
      error: error.type,
      message: error.message,
      code: error.code,
    }, status);
  }

  /**
   * Check if an error is retryable
   * @param error Blockchain error
   * @returns True if the error is retryable
   */
  isRetryable(error: BlockchainError): boolean {
    // Use the retryable flag if it's set
    if (error.retryable !== undefined) {
      return error.retryable;
    }
    
    // Otherwise, use the error type to determine if it's retryable
    switch (error.type) {
      case BlockchainErrorType.NETWORK_ERROR:
      case BlockchainErrorType.TIMEOUT:
      case BlockchainErrorType.RATE_LIMIT:
      case BlockchainErrorType.TRANSACTION_UNDERPRICED:
      case BlockchainErrorType.NONCE_EXPIRED:
      case BlockchainErrorType.NONCE_TOO_LOW:
      case BlockchainErrorType.NONCE_TOO_HIGH:
      case BlockchainErrorType.TRANSACTION_OUT_OF_GAS:
      case BlockchainErrorType.CHAIN_DISCONNECTED:
        return true;
        
      case BlockchainErrorType.TRANSACTION_REPLACED:
        // Only retry if the transaction was cancelled, not if it was replaced or repriced
        return error.data?.reason === 'cancelled';
        
      default:
        return false;
    }
  }

  /**
   * Get a user-friendly error message
   * @param error Blockchain error
   * @returns User-friendly error message
   */
  getUserFriendlyMessage(error: BlockchainError): string {
    switch (error.type) {
      case BlockchainErrorType.TRANSACTION_REVERTED:
        // Try to provide more specific information if available
        if (error.message.includes('reverted')) {
          const reason = this.extractRevertReason(error.originalError);
          if (reason) {
            return `Transaction failed: ${reason}`;
          }
        }
        return 'The transaction was rejected by the blockchain. Please check your inputs and try again.';
        
      case BlockchainErrorType.TRANSACTION_OUT_OF_GAS:
        return 'The transaction ran out of gas. Please try again with a higher gas limit.';
        
      case BlockchainErrorType.TRANSACTION_UNDERPRICED:
        return 'The transaction fee is too low. Please try again with a higher fee.';
        
      case BlockchainErrorType.TRANSACTION_REPLACED:
        if (error.data?.reason === 'cancelled') {
          return 'The transaction was cancelled. Please try again.';
        } else if (error.data?.reason === 'repriced') {
          return 'The transaction was replaced with a higher fee.';
        }
        return 'The transaction was replaced by another transaction.';
        
      case BlockchainErrorType.INSUFFICIENT_FUNDS:
        return 'You do not have enough funds to complete this transaction.';
        
      case BlockchainErrorType.UNAUTHORIZED:
        return 'You are not authorized to perform this action.';
        
      case BlockchainErrorType.REJECTED_BY_USER:
        return 'The transaction was rejected by the user.';
        
      case BlockchainErrorType.INVALID_ARGUMENT:
        return `Invalid input: ${error.data?.argument || 'Please check your inputs and try again.'}`;
        
      case BlockchainErrorType.MISSING_ARGUMENT:
        return `Missing required input: ${error.data?.argument || 'Please provide all required information.'}`;
        
      case BlockchainErrorType.NETWORK_ERROR:
      case BlockchainErrorType.CHAIN_DISCONNECTED:
        return 'There was a problem connecting to the blockchain. Please check your network connection and try again.';
        
      case BlockchainErrorType.TIMEOUT:
        return 'The operation timed out. The network might be congested. Please try again later.';
        
      case BlockchainErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
        
      case BlockchainErrorType.UNPREDICTABLE_GAS:
        return 'Unable to estimate gas for this transaction. The operation might not be possible with the current parameters.';
        
      case BlockchainErrorType.CONTRACT_NOT_DEPLOYED:
        return 'The contract does not exist at the specified address.';
        
      case BlockchainErrorType.NONCE_TOO_LOW:
      case BlockchainErrorType.NONCE_TOO_HIGH:
      case BlockchainErrorType.NONCE_EXPIRED:
        return 'Transaction sequence error. Please try again.';
        
      case BlockchainErrorType.UNSUPPORTED_OPERATION:
        return 'This operation is not supported by the current network or contract.';
        
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }
}