import { SetMetadata } from '@nestjs/common';

/**
 * Decorator that marks a route handler as exempt from rate limiting
 * This works with both the built-in ThrottlerGuard and our custom RateLimitGuard
 */
export const SkipThrottle = () => {
  return (target: any, key?: string, descriptor?: any) => {
    if (key) {
      SetMetadata('skipThrottle', true)(target, key, descriptor);
      SetMetadata('skipRateLimit', true)(target, key, descriptor);
    } else {
      SetMetadata('skipThrottle', true)(target);
      SetMetadata('skipRateLimit', true)(target);
    }
    return descriptor;
  };
};