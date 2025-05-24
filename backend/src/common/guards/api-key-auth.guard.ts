import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppLoggerService } from '../services/logging.service';

/**
 * API key authentication guard
 */
@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {
  private readonly logger: AppLoggerService;

  constructor(loggerService: AppLoggerService) {
    super();
    this.logger = loggerService.createLogger(ApiKeyAuthGuard.name);
  }

  /**
   * Handle unauthorized errors
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const path = request ? `${request.method} ${request.url}` : 'unknown';
      
      this.logger.warn(`API key authentication failed for ${path}: ${info?.message || err?.message || 'Unauthorized'}`);
      
      throw err || new UnauthorizedException('Valid API key required');
    }
    
    return user;
  }
}