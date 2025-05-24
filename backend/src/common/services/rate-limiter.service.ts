import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AppLoggerService } from './logging.service';
import { RateLimitOptions, RateLimitResult } from '../types/rate-limit.types';

/**
 * Service for rate limiting requests
 */
@Injectable()
export class RateLimiterService {
  private readonly logger: AppLoggerService;
  private readonly defaultOptions: RateLimitOptions = {
    points: 100,
    duration: 60,
    blockDuration: 60,
  };

  constructor(
    private readonly redis: RedisService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(RateLimiterService.name);
  }

  private getWindow(timestamp: number, duration: number): { start: number; end: number } {
    const windowStart = Math.floor(timestamp / 1000) - duration;
    const windowEnd = Math.floor(timestamp / 1000);
    return { start: windowStart, end: windowEnd };
  }

  private async getCurrentCount(key: string, startTime: number): Promise<number> {
    try {
      return await this.redis.zCount(key, startTime, Number.MAX_SAFE_INTEGER);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error getting count: ${err.message}`, err.stack);
      return 0;
    }
  }

  private generateKey(identifier: string, prefix = 'ratelimit'): string {
    return `${prefix}:${identifier}:${Math.floor(Date.now() / 1000)}`;
  }

  /**
   * Check rate limit for a given key
   * Uses sliding window algorithm with Redis sorted sets
   */
  async checkRateLimit(
    identifier: string,
    options?: Partial<RateLimitOptions>,
  ): Promise<RateLimitResult> {
    const opts = { ...this.defaultOptions, ...options };
    const now = Date.now();
    const key = this.generateKey(identifier);
    const { start, end } = this.getWindow(now, opts.duration);

    try {
      // Clean old records
      await this.redis.zRemRangeByScore(key, Number.NEGATIVE_INFINITY, start);

      // Get current count
      const currentCount = await this.getCurrentCount(key, start);

      if (currentCount >= opts.points) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: end * 1000,
        };
      }

      // Record new request
      const member = `${now}:${identifier}`;
      await this.redis.zAdd(key, now, member);
      await this.redis.expire(key, opts.duration);

      return {
        allowed: true,
        remaining: opts.points - currentCount - 1,
        resetTime: end * 1000,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Rate limit error: ${err.message}`, err.stack);
      
      // Fail open - allow request in case of Redis errors
      return {
        allowed: true,
        remaining: 1,
        resetTime: (Math.floor(now / 1000) + opts.duration) * 1000,
      };
    }
  }
}