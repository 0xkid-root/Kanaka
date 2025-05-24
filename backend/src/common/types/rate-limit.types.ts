/**
 * Rate limit options interface
 */
export interface RateLimitOptions {
  /**
   * Number of requests allowed within the duration
   */
  points: number;

  /**
   * Time window in seconds
   */
  duration: number;

  /**
   * Duration to block if limit is exceeded (in seconds)
   * Optional - if not set, no blocking occurs after limit is reached
   */
  blockDuration?: number;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of remaining requests in the current window
   */
  remaining: number;

  /**
   * Time until the rate limit resets (in seconds)
   */
  resetTime: number;
}
