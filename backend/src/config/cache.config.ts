import { registerAs } from '@nestjs/config';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { CacheStore } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

export default registerAs('cache', () => ({
  isGlobal: true,
  useFactory: async (configService: ConfigService): Promise<CacheModuleOptions> => {
    const isProduction = configService.get('NODE_ENV') === 'production';

    if (isProduction) {
      const store = await redisStore.redisStore({
        socket: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
        password: configService.get('REDIS_PASSWORD', ''),
        ttl: configService.get('REDIS_TTL', 300),
      }) as unknown as CacheStore;

      return {
        store,
        ttl: configService.get('REDIS_TTL', 300),
        max: configService.get('REDIS_MAX_ITEMS', 1000),
        isGlobal: true,
      };
    }

    // In-memory cache for development
    return {
      ttl: 300, // 5 minutes
      max: 1000,
      isGlobal: true,
    };
  },
}));