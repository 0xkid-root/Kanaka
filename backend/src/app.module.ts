import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-store';
import { BlockchainErrorInterceptor } from './common/interceptors/blockchain-error.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { RequestSanitizerMiddleware } from './common/middleware/request-sanitizer.middleware';
import { CommonModule } from './common/common.module';
import { UserModule } from './modules/user/user.module';
import { DefiModule } from './modules/defi/defi.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RebalancerModule } from './modules/rebalancer/rebalancer.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { SocialModule } from './modules/social/social.module';
import { VisualizerModule } from './modules/visualizer/visualizer.module';
import { YieldEngineModule } from './modules/yield-engine/yield-engine.module';
import { CDROracleModule } from './modules/cdr-oracle/cdr-oracle.module';
import { RewardDistributorModule } from './modules/reward-distributor/reward-distributor.module';
import { VaultManagerModule } from './modules/vault-manager/vault-manager.module';
import { StrategyRegistryModule } from './modules/strategy-registry/strategy-registry.module';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpCacheInterceptor } from './common/interceptors/cache.interceptor';
import contractsConfig from './config/contracts.config';
import databaseConfig from './config/database.config';
import { CacheStore } from '@nestjs/cache-manager';

@Module({
  imports: [
    // Load environment variables and configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [contractsConfig, databaseConfig],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000, // time-to-live in milliseconds
      limit: 100, // the maximum number of requests within the TTL
    }]),

    // Cache configuration
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisPassword = configService.get('REDIS_PASSWORD');
        const redisConfig: any = {
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            ...(configService.get('REDIS_TLS') === 'true' ? { tls: true } : {}),
          },
          ttl: configService.get('REDIS_TTL', 300), // 5 minutes default
        };

        // Only include password if it exists and is a non-empty string
        if (redisPassword) {
          redisConfig.password = redisPassword;
        }

        const store = (await redisStore(redisConfig)) as unknown as CacheStore;

        return {
          store,
          ttl: configService.get('REDIS_TTL', 300), // 5 minutes default
        };
      },
      inject: [ConfigService],
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
    }),

    // Common module
    CommonModule,

    // Application modules
    UserModule,
    DefiModule,
    AnalyticsModule,
    RebalancerModule,
    GovernanceModule,
    SocialModule,
    VisualizerModule,
    YieldEngineModule,
    CDROracleModule,
    RewardDistributorModule,
    VaultManagerModule,
    StrategyRegistryModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BlockchainErrorInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware, SecurityHeadersMiddleware, RequestSanitizerMiddleware)
      .forRoutes('*');
  }
}