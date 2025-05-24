import { Logger } from '@nestjs/common';

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Whether to use exponential backoff
   */
  exponentialBackoff?: boolean;
  
  /**
   * Maximum delay in milliseconds (for exponential backoff)
   */
  maxDelay?: number;
  
  /**
   * Types of errors to retry on (default: all errors)
   */
  retryOnErrors?: any[];
  
  /**
   * Types of errors not to retry on
   */
  doNotRetryOnErrors?: any[];
  
  /**
   * Custom function to determine if a retry should be attempted
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  
  /**
   * Custom function to execute before each retry
   */
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Decorator that adds retry logic to a method
 * @param options Retry options
 */
export function Retry(options: RetryOptions = {}) {
  const defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    maxDelay: 30000,
    retryOnErrors: [],
    doNotRetryOnErrors: [],
    shouldRetry: () => true,
    onRetry: () => {},
  };
  
  const opts = { ...defaultOptions, ...options };
  const logger = new Logger('RetryDecorator');
  
  return function(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      let attempt = 0;
      let lastError: unknown = new Error('Unknown error occurred');
      
      while (attempt <= opts.maxRetries) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          attempt++;
          
          // Check if we've reached the maximum number of retries
          if (attempt > opts.maxRetries) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Method ${propertyKey} failed after ${opts.maxRetries} retries: ${errorMessage}`);
            throw error;
          }
          
          // Check if we should retry based on the error type
          const shouldNotRetry = 
            (opts.doNotRetryOnErrors.length > 0 && 
              opts.doNotRetryOnErrors.some(errorType => error instanceof errorType)) ||
            (opts.retryOnErrors.length > 0 && 
              !opts.retryOnErrors.some(errorType => error instanceof errorType));
          
          if (shouldNotRetry || !opts.shouldRetry(error, attempt)) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`Not retrying method ${propertyKey} after error: ${errorMessage}`);
            throw error;
          }
          
          // Calculate delay with exponential backoff if enabled
          let delay = opts.retryDelay;
          if (opts.exponentialBackoff) {
            delay = Math.min(
              opts.retryDelay * Math.pow(2, attempt - 1),
              opts.maxDelay
            );
          }
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`Retrying method ${propertyKey} (attempt ${attempt}/${opts.maxRetries}) after error: ${errorMessage}`);
          
          // Call the onRetry callback
          opts.onRetry(error, attempt);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // This should never be reached, but just in case
      throw lastError;
    };
    
    return descriptor;
  };
}