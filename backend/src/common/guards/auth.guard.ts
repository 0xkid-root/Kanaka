import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AppLoggerService } from '../services/logging.service';

/**
 * Combined authentication guard that accepts either JWT or API key
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard(['jwt', 'api-key']) {
  private readonly logger: AppLoggerService;

  constructor(loggerService: AppLoggerService) {
    super();
    this.logger = loggerService.createLogger(AuthGuard.name);
  }

  /**
   * Handle unauthorized errors
   */
  override handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const path = request ? `${request.method} ${request.url}` : 'unknown';
      
      this.logger.warn(`Authentication failed for ${path}: ${info?.message || err?.message || 'Unauthorized'}`);
      
      throw err || new UnauthorizedException('Authentication required (JWT or API key)');
    }
    
    return user;
  }
}