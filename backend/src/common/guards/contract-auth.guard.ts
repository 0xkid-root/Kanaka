import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from '../services/config.service';
import { AppLoggerService } from '../services/logging.service';
import { ContractService } from '../services/contract.service';
import { SensitiveDataFilter } from '../filters/sensitive-data.filter';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { ethers } from 'ethers';

/**
 * Metadata key for the contract action decorator
 */
export const CONTRACT_ACTION_KEY = 'contract_action';

/**
 * Contract action metadata
 */
export interface ContractActionOptions {
  /**
   * Contract name
   */
  contract: string;
  
  /**
   * Action name
   */
  action: string;
  
  /**
   * Roles allowed to perform this action
   */
  roles?: string[];
}

/**
 * Guard that ensures only authorized addresses can perform sensitive contract actions
 */
@Injectable()
export class ContractAuthGuard implements CanActivate {
  private readonly logger: AppLoggerService;
  private readonly adminAddresses: string[];

  constructor(
    private reflector: Reflector,
    private configService: AppConfigService,
    private contractService: ContractService,
    loggerService: AppLoggerService,
    private sensitiveDataFilter: SensitiveDataFilter,
    private circuitBreaker: CircuitBreakerService,
  ) {
    this.logger = loggerService.createLogger(ContractAuthGuard.name);
    
    // Load admin addresses from config
    const adminAddressesStr = this.configService.get('ADMIN_ADDRESSES', '');
    this.adminAddresses = adminAddressesStr
      .split(',')
      .map((addr: string) => addr.trim().toLowerCase())
      .filter((addr: string) => addr.length > 0 && ethers.utils.isAddress(addr));
    
    if (this.adminAddresses.length === 0) {
      this.logger.warn('No admin addresses configured. Contract actions may be unrestricted.');
    } else {
      this.logger.log(`Loaded ${this.adminAddresses.length} admin addresses`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const contractAction = this.reflector.get<ContractActionOptions>(
      CONTRACT_ACTION_KEY,
      context.getHandler(),
    );
    
    // If no contract action is specified, allow the request
    if (!contractAction) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // If no user is authenticated, deny access
    if (!user || !user.address) {
      this.logger.warn(`Unauthorized contract action attempt: ${contractAction.contract}.${contractAction.action}`);
      throw new UnauthorizedException('Authentication required for this action');
    }
    
    // Validate the address format
    if (!ethers.utils.isAddress(user.address)) {
      this.logger.warn(`Invalid address format: ${this.sensitiveDataFilter.filterString(user.address)}`);
      throw new UnauthorizedException('Invalid address format');
    }
    
    const userAddress = user.address.toLowerCase();
    
    // Check if the circuit breaker is tripped for this contract
    const circuitBreakerKey = `contract:${contractAction.contract}`;
    const circuitState = this.circuitBreaker.getCircuitState(circuitBreakerKey);
    if (circuitState === 'OPEN') {
      this.logger.warn(`Circuit breaker tripped for ${contractAction.contract}`);
      throw new ForbiddenException(`Operations for ${contractAction.contract} are temporarily disabled`);
    }
    
    // Check if the user is an admin
    if (this.adminAddresses.includes(userAddress)) {
      this.logger.log(`Admin ${userAddress} authorized for ${contractAction.contract}.${contractAction.action}`);
      return true;
    }
    
    // Check if the user has the required roles
    if (contractAction.roles && contractAction.roles.length > 0) {
      if (!user.roles || !Array.isArray(user.roles)) {
        this.logger.warn(`User ${userAddress} has no roles for ${contractAction.contract}.${contractAction.action}`);
        throw new UnauthorizedException('You do not have the required role for this action');
      }
      
      const hasRequiredRole = contractAction.roles.some(role => user.roles.includes(role));
      
      if (!hasRequiredRole) {
        this.logger.warn(`User ${userAddress} lacks required roles for ${contractAction.contract}.${contractAction.action}`);
        throw new UnauthorizedException('You do not have the required role for this action');
      }
      
      this.logger.log(`User ${userAddress} authorized by role for ${contractAction.contract}.${contractAction.action}`);
      return true;
    }
    
    // If no roles are specified, check contract-specific permissions
    try {
      // Use circuit breaker pattern for contract calls
      const circuitBreakerKey = `contract:${contractAction.contract}:${contractAction.action}`;
      
      return await this.circuitBreaker.execute(
        circuitBreakerKey,
        async () => {
          // This is where we would check on-chain permissions
          // For example, checking if the user has a specific role in the contract
          const contract = await this.contractService.getContract(contractAction.contract);
          
          // Example: Check if the user has the required role in the contract
          // This is just an example and should be adapted to your specific contract
          if (contract.interface && contract.interface.hasFunction && contract.interface.hasFunction('hasRole')) {
            const actionRole = ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(`ROLE_${contractAction.action.toUpperCase()}`)
            );
            
            const hasRole = await contract.hasRole(actionRole, userAddress);
            
            if (hasRole) {
              this.logger.log(`User ${userAddress} authorized by contract role for ${contractAction.contract}.${contractAction.action}`);
              return true;
            }
          }
          
          // Example: Check if the user is an owner
          if (contract.interface && contract.interface.hasFunction && contract.interface.hasFunction('owner')) {
            const owner = await contract.owner();
            
            if (owner.toLowerCase() === userAddress) {
              this.logger.log(`Owner ${userAddress} authorized for ${contractAction.contract}.${contractAction.action}`);
              return true;
            }
          }
          
          // Check if the user has permission for this specific action
          if (contract.interface && contract.interface.hasFunction && contract.interface.hasFunction('canPerformAction')) {
            const canPerform = await contract.canPerformAction(userAddress, contractAction.action);
            
            if (canPerform) {
              this.logger.log(`User ${userAddress} authorized for action ${contractAction.action}`);
              return true;
            }
          }
          
          this.logger.warn(`User ${userAddress} not authorized for ${contractAction.contract}.${contractAction.action}`);
          throw new ForbiddenException('You are not authorized to perform this action');
        },
        {
          failureTypes: [Error, ForbiddenException]
        }
      ).catch((error: any) => {
          if (error instanceof ForbiddenException) {
            throw error;
          }
          
          const filteredMessage = this.sensitiveDataFilter
            ? this.sensitiveDataFilter.filterString(error.message)
            : error.message;
            
          const filteredStack = this.sensitiveDataFilter && error.stack
            ? this.sensitiveDataFilter.filterString(error.stack)
            : error.stack;
          
          this.logger.error(`Error checking contract permissions: ${filteredMessage}`, filteredStack);
          throw new UnauthorizedException('Error checking permissions');
        }
      );
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      const filteredMessage = this.sensitiveDataFilter
        ? this.sensitiveDataFilter.filterString(error instanceof Error ? error.message : String(error))
        : (error instanceof Error ? error.message : String(error));
        
      this.logger.error(`Unexpected error in contract auth: ${filteredMessage}`, error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('Error checking permissions');
    }
  }
}