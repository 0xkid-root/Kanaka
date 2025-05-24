import { SetMetadata } from '@nestjs/common';
import { CONTRACT_ACTION_KEY, ContractActionOptions } from '../guards/contract-auth.guard';

/**
 * Decorator that marks a route handler as requiring contract action authorization
 * @param options Contract action options
 */
export const ContractAction = (options: ContractActionOptions) => 
  SetMetadata(CONTRACT_ACTION_KEY, options);