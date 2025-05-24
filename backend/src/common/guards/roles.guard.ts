import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppLoggerService } from '../services/logging.service';

/**
 * Metadata key for the roles decorator
 */
export const ROLES_KEY = 'roles';

/**
 * Guard that checks if the user has the required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger: AppLoggerService;

  constructor(
    private reflector: Reflector,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(RolesGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // If no user is authenticated, deny access
    if (!user) {
      this.logger.warn(`Access denied: No authenticated user`);
      throw new ForbiddenException('Access denied');
    }
    
    // Check if the user has any of the required roles
    const hasRole = requiredRoles.some(role => 
      user.roles && user.roles.includes(role)
    );
    
    if (!hasRole) {
      const path = request ? `${request.method} ${request.url}` : 'unknown';
      this.logger.warn(`Access denied: User lacks required roles for ${path}`);
      throw new ForbiddenException('You do not have the required role to access this resource');
    }
    
    return true;
  }
}