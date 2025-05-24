import { registerAs } from '@nestjs/config';
import { ContractAddresses } from '../common/types/contracts';

export default registerAs('contracts', (): ContractAddresses => ({
  VAULT_MANAGER_ADDRESS: process.env.VAULT_MANAGER_ADDRESS || '',
  YIELD_ENGINE_ADDRESS: process.env.YIELD_ENGINE_ADDRESS || '',
  CDR_ORACLE_ADDRESS: process.env.CDR_ORACLE_ADDRESS || '',
  STRATEGY_REGISTRY_ADDRESS: process.env.STRATEGY_REGISTRY_ADDRESS || '',
  GOVERNANCE_ADDRESS: process.env.GOVERNANCE_ADDRESS || '',
  REWARD_DISTRIBUTOR_ADDRESS: process.env.REWARD_DISTRIBUTOR_ADDRESS || '',
}));
