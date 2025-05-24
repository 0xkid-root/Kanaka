import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorator that marks a route handler as requiring specific roles
 * @param roles Roles required to access the route
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);