import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get databaseConfig() {
    return {
      type: 'sqlite',
      database: this.configService.get<string>('DATABASE_PATH', 'kanaka.db'),
      synchronize: !this.isProduction,
    };
  }

  get jwtConfig() {
    return {
      secret: this.configService.get<string>('JWT_SECRET', 'secret'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    };
  }

  get throttleConfig() {
    return {
      ttl: this.configService.get<number>('THROTTLE_TTL', 60),
      limit: this.configService.get<number>('THROTTLE_LIMIT', 100),
    };
  }

  get cacheConfig() {
    return {
      ttl: this.configService.get<number>('CACHE_TTL', 60000),
      max: this.configService.get<number>('CACHE_MAX', 100),
    };
  }

  get corsConfig() {
    return {
      origin: this.configService.get<string>('CORS_ORIGIN', '*'),
      methods: this.configService.get<string>('CORS_METHODS', 'GET,HEAD,PUT,PATCH,POST,DELETE'),
      credentials: this.configService.get<boolean>('CORS_CREDENTIALS', true),
    };
  }

  get(key: string, defaultValue?: any): any {
    return this.configService.get(key, defaultValue);
  }
}