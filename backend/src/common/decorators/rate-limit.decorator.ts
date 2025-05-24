import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions } from '../types/rate-limit.types';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator that sets custom rate limit options for a route handler
 * @param options Rate limit options
 */
export const RateLimit = (options: Partial<RateLimitOptions>) => 
  SetMetadata(RATE_LIMIT_KEY, options);