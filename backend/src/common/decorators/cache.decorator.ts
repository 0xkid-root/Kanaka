import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cacheKey';
export const CACHE_TTL_METADATA = 'cacheTTL';
export const SKIP_CACHE_METADATA = 'skipCache';

/**
 * Decorator to set a custom cache key for a route handler
 * @param key - The custom cache key
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Decorator to set a custom TTL (Time To Live) for cached data
 * @param ttl - Time to live in seconds
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

/**
 * Decorator to skip cache for a specific route handler
 */
export const SkipCache = () => SetMetadata(SKIP_CACHE_METADATA, true);

/**
 * Decorator to set both cache key and TTL
 * @param key - The custom cache key
 * @param ttl - Time to live in seconds
 */
export const Cache = (key: string, ttl: number) => (
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
  SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
  return descriptor;
};
