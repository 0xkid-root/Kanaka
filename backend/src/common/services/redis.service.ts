import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { AppLoggerService } from './logging.service';

interface RedisError extends Error {
  code?: string;
  command?: string;
}

interface ErrorInfo {
  message: string;
  stack?: string | undefined;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;
  private readonly logger: AppLoggerService;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number = 10;

  constructor(
    private readonly configService: ConfigService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(RedisService.name);
    
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get('REDIS_PORT', '6379');
    const redisPassword = this.configService.get('REDIS_PASSWORD', '');
    const redisUrl = `redis://${redisHost}:${redisPort}`;
    
    this.logger.log(`Initializing Redis client with URL: ${redisUrl}`);
    
    this.client = createClient({
      url: redisUrl,
      password: redisPassword,
    });

    this.setupEventListeners();
  }

  private formatError(error: unknown): ErrorInfo {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    if (typeof error === 'string') {
      return { message: error };
    }
    return { message: 'Unknown error' };
  }
  
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('error', (err: RedisError) => {
      this.isConnected = false;
      this.logger.error(`Redis client error: ${err.message}`, err.stack);
    });
    
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });
    
    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('Redis client ready');
    });
    
    this.client.on('end', () => {
      this.isConnected = false;
      this.logger.log('Redis client disconnected');
    });
    
    this.client.on('reconnecting', () => {
      this.logger.log(`Redis client reconnecting (attempt ${this.reconnectAttempts + 1})`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Connecting to Redis...');
      await this.connect();
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`Failed to connect to Redis: ${message}`, stack);
      this.scheduleReconnect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Disconnecting from Redis...');
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.isConnected) {
        await this.client.quit();
      }
      
      this.logger.log('Redis client disconnected');
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`Error disconnecting from Redis: ${message}`, stack);
    }
  }
  
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to Redis');
    } catch (error: unknown) {
      this.isConnected = false;
      throw error;
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.logger.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.logger.log(`Scheduling Redis reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error: unknown) {
        const { message, stack } = this.formatError(error);
        this.logger.error(`Failed to reconnect to Redis: ${message}`, stack);
        this.scheduleReconnect();
      }
    }, delay);
  }

  // Connection status check
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  // Basic operations
  /**
   * Set a key-value pair in Redis
   * @param key Key
   * @param value Value
   * @param expireSeconds Optional expiration time in seconds
   */
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Setting Redis key: ${key}`);
      
      if (typeof expireSeconds === 'number' && expireSeconds > 0) {
        await this.client.set(key, value, { EX: expireSeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to set Redis key ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Get a value from Redis by key
   * @param key Key
   * @returns Value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Getting Redis key: ${key}`);
      return await this.client.get(key);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get Redis key ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   * @param key Key to delete
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Deleting Redis key: ${key}`);
      await this.client.del(key);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to delete Redis key ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Get keys matching a pattern
   * @param pattern Pattern to match
   * @returns Array of keys
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Getting Redis keys matching pattern: ${pattern}`);
      return await this.client.keys(pattern);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get Redis keys matching ${pattern}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  // JSON operations
  /**
   * Set JSON value in Redis
   * @param key Key
   * @param value Value to store as JSON
   * @param expireSeconds Optional expiration time in seconds
   */
  async setJson<T>(key: string, value: T, expireSeconds?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, expireSeconds);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to set JSON in Redis for key ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      throw error;
    }
  }

  /**
   * Get JSON value from Redis
   * @param key Key
   * @returns Parsed JSON value or null if not found
   */
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get JSON from Redis for key ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      return null;
    }
  }

  // Sorted Set operations
  /**
   * Add member to sorted set
   * @param key Key of sorted set
   * @param score Score for the member
   * @param member Member to add
   */
  async zAdd(key: string, score: number, member: string): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Adding member to sorted set ${key}: ${member} (score: ${score})`);
      await this.client.zAdd(key, [{ score, value: member }]);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to add member to sorted set ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Remove members from sorted set by score range
   * @param key Key of sorted set
   * @param min Minimum score (inclusive)
   * @param max Maximum score (inclusive)
   */
  async zRemRangeByScore(key: string, min: number, max: number): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Removing members from sorted set ${key} with score between ${min} and ${max}`);
      await this.client.zRemRangeByScore(key, min, max);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to remove members from sorted set ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Get count of members in sorted set
   * @param key Key of sorted set
   * @returns Number of members
   */
  async zCard(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Getting cardinality of sorted set ${key}`);
      return await this.client.zCard(key);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get cardinality of sorted set ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Count members in sorted set within score range
   * @param key Key of sorted set
   * @param min Minimum score (inclusive)
   * @param max Maximum score (inclusive)  
   */
  async zCount(key: string, min: number, max: number): Promise<number> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Counting members in sorted set ${key} with score between ${min} and ${max}`);
      return await this.client.zCount(key, min, max);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to count members in sorted set ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Set key expiration
   * @param key Key to expire
   * @param expireSeconds Time in seconds until expiration
   */
  async expire(key: string, expireSeconds: number): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn('Redis is not connected. Attempting to reconnect...');
        await this.connect();
      }
      
      this.logger.debug(`Setting expiration for key ${key} to ${expireSeconds}s`);
      await this.client.expire(key, expireSeconds);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to set expiration for key ${key}: ${this.formatError(error).message}`,
        this.formatError(error).stack
      );
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }
}
