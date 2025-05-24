import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RateLimitOptions } from '../types/rate-limit.types';
import { AppLoggerService } from '../services/logging.service';
import { Request } from 'express';

/**
 * Metadata key for the rate limit decorator
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Guard that implements rate limiting
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger: AppLoggerService;

  constructor(
    private reflector: Reflector,
    private rateLimiterService: RateLimiterService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(RateLimitGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint should skip rate limiting
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>('skipRateLimit', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (skipRateLimit) {
      return true;
    }
    
    // Get custom rate limit options if specified
    const options = this.reflector.getAllAndOverride<Partial<RateLimitOptions>>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    const request = context.switchToHttp().getRequest<Request>();
    
    // Get the rate limit key (IP address or user ID)
    const key = this.getRateLimitKey(request);
    
    // Check the rate limit
    const result = await this.rateLimiterService.checkRateLimit(key, options as Partial<RateLimitOptions>);
    
    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', options.points?.toString() || '100');
    response.header('X-RateLimit-Remaining', result.remaining.toString());
    response.header('X-RateLimit-Reset', result.resetTime.toString());
    
    // If the rate limit has been exceeded, throw an exception
    if (!result.allowed) {
      this.logger.warn(`Rate limit exceeded for ${key} on ${request.method} ${request.url}`);
      
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.resetTime,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    
    return true;
  }

  /**
   * Get the rate limit key for a request
   * @param request HTTP request
   * @returns Rate limit key
   */
  private getRateLimitKey(request: Request): string {
    // If the user is authenticated, use their ID
    if (request.user && (request.user as any).id) {
      return `user:${(request.user as any).id}`;
    }
    
    // Otherwise, use the IP address
    const ip = request.ip || 
      request.connection.remoteAddress || 
      'unknown';
    
    return `ip:${ip}`;
  }
}