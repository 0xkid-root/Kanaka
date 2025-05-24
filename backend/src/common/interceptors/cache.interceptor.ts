import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';
import { Request } from 'express';
import { createHash } from 'crypto';

interface RequestUser {
  id: string | number;
}

interface RequestWithUser extends Request {
  user?: RequestUser;
}

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);
  private readonly defaultTTL = 300; // 5 minutes

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  private generateCacheKey(context: ExecutionContext, request: RequestWithUser): string {
    if (!context) throw new Error('ExecutionContext is required');

    const handler = context.getHandler();
    const controller = context.getClass();
    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    
    const baseKey = customKey || `${controller.name}:${handler.name}`;
    const queryParams = JSON.stringify(request.query || {});
    const urlPath = request.path || request.url || '/';
    const userId = request.user?.id || 'anonymous';

    return createHash('sha256')
      .update(`${baseKey}:${urlPath}:${queryParams}:${userId}`)
      .digest('hex');
  }

  private shouldSkipCache(context: ExecutionContext): boolean {
    if (!context) return true;
    const handler = context.getHandler();
    return this.reflector.get<boolean>('skipCache', handler) === true;
  }

  private getTTL(context: ExecutionContext): number {
    if (!context) return this.defaultTTL;
    const handler = context.getHandler();
    const customTTL = this.reflector.get<number>(CACHE_TTL_METADATA, handler);
    return typeof customTTL === 'number' ? customTTL : this.defaultTTL;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    if (!context || !next) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request || request.method !== 'GET' || this.shouldSkipCache(context)) {
      return next.handle();
    }

    const key = this.generateCacheKey(context, request);
    const ttl = this.getTTL(context);

    try {
      const cachedResponse = await this.cacheManager.get(key);
      if (cachedResponse !== undefined && cachedResponse !== null) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return of(cachedResponse);
      }

      this.logger.debug(`Cache miss for key: ${key}`);
      return next.handle().pipe(
        tap(async (response: unknown) => {
          if (response !== undefined && response !== null) {
            await this.cacheManager.set(key, response, ttl);
            this.logger.debug(`Cached response for key: ${key} with TTL: ${ttl}s`);
          }
        }),
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Cache error: ${err.message}`, err.stack);
      return next.handle();
    }
  }
}