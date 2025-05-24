import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppLoggerService } from '../services/logging.service';

/**
 * JWT authentication guard
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger: AppLoggerService;

  constructor(loggerService: AppLoggerService) {
    super();
    this.logger = loggerService.createLogger(JwtAuthGuard.name);
  }

  /**
   * Handle unauthorized errors
   */
  override handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const path = request ? `${request.method} ${request.url}` : 'unknown';
      
      this.logger.warn(`JWT authentication failed for ${path}: ${info?.message || err?.message || 'Unauthorized'}`);
      
      throw err || new UnauthorizedException('Authentication required');
    }
    
    return user;
  }
}
