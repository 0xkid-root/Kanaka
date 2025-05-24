import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AppLoggerService } from './logging.service';
import { v4 as uuidv4 } from 'uuid';

interface LockOptions {
  /**
   * Lock expiration time in seconds
   */
  ttl?: number;
  
  /**
   * Number of retry attempts
   */
  retries?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
}

@Injectable()
export class LockService {
  private readonly logger: AppLoggerService;
  private readonly defaultOptions: LockOptions = {
    ttl: 30,
    retries: 5,
    retryDelay: 200,
  };

  constructor(
    private redisService: RedisService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(LockService.name);
  }

  /**
   * Acquire a distributed lock
   * @param key Lock key
   * @param options Lock options
   * @returns Lock token if successful, null otherwise
   */
  async acquire(key: string, options?: LockOptions): Promise<string | null> {
    const opts = { ...this.defaultOptions, ...options };
    const lockKey = `lock:${key}`;
    const token = uuidv4();
    
    this.logger.debug(`Attempting to acquire lock: ${key}`);
    
    let acquired = false;
    let attempts = 0;
    
    while (!acquired && attempts < opts.retries) {
      try {
        acquired = await this.redisService.setNX(lockKey, token, opts.ttl);
        
        if (acquired) {
          this.logger.debug(`Lock acquired: ${key} with token ${token}`);
          return token;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
        attempts++;
        
        this.logger.debug(`Failed to acquire lock: ${key}, attempt ${attempts}/${opts.retries}`);
      } catch (error) {
        this.logger.error(`Error acquiring lock ${key}: ${error.message}`, error.stack);
        return null;
      }
    }
    
    this.logger.debug(`Failed to acquire lock after ${attempts} attempts: ${key}`);
    return null;
  }

  /**
   * Release a distributed lock
   * @param key Lock key
   * @param token Lock token
   * @returns True if the lock was released
   */
  async release(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    
    try {
      this.logger.debug(`Attempting to release lock: ${key} with token ${token}`);
      
      // Get the current token
      const currentToken = await this.redisService.get(lockKey);
      
      // Only release if the token matches
      if (currentToken === token) {
        await this.redisService.del(lockKey);
        this.logger.debug(`Lock released: ${key}`);
        return true;
      } else if (currentToken === null) {
        this.logger.debug(`Lock already released or expired: ${key}`);
        return true;
      } else {
        this.logger.warn(`Cannot release lock ${key}: token mismatch`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error releasing lock ${key}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Extend a lock's expiration time
   * @param key Lock key
   * @param token Lock token
   * @param ttl New TTL in seconds
   * @returns True if the lock was extended
   */
  async extend(key: string, token: string, ttl: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    
    try {
      this.logger.debug(`Attempting to extend lock: ${key} with token ${token}`);
      
      // Get the current token
      const currentToken = await this.redisService.get(lockKey);
      
      // Only extend if the token matches
      if (currentToken === token) {
        await this.redisService.set(lockKey, token, ttl);
        this.logger.debug(`Lock extended: ${key}`);
        return true;
      } else if (currentToken === null) {
        this.logger.warn(`Cannot extend lock ${key}: lock not found`);
        return false;
      } else {
        this.logger.warn(`Cannot extend lock ${key}: token mismatch`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error extending lock ${key}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Execute a function with a lock
   * @param key Lock key
   * @param fn Function to execute
   * @param options Lock options
   * @returns Result of the function
   */
  async withLock<T>(key: string, fn: (token: string) => Promise<T>, options?: LockOptions): Promise<T> {
    const token = await this.acquire(key, options);
    
    if (!token) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }
    
    try {
      return await fn(token);
    } finally {
      await this.release(key, token);
    }
  }
}