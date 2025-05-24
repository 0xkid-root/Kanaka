export interface PoolMetrics {
  volatility: bigint;
  correlation: bigint;
  tvl: bigint;
  apr: bigint;
  last_update: bigint;
}

export interface Pool {
  token: string;
  strategy: string;
  min_deposit: bigint;
  max_capacity: bigint;
  total_supply: bigint;
  weight: bigint;
}

export interface Proposal {
  id: bigint;
  description: string;
  proposer: string;
  start_block: bigint;
  end_block: bigint;
  for_votes: bigint;
  against_votes: bigint;
  executed: boolean;
}

export interface Vote {
  voter: string;
  proposal_id: bigint;
  support: boolean;
  weight: bigint;
}

export interface ContractAddresses {
  VAULT_MANAGER_ADDRESS: string;
  YIELD_ENGINE_ADDRESS: string;
  CDR_ORACLE_ADDRESS: string;
  STRATEGY_REGISTRY_ADDRESS: string;
  GOVERNANCE_ADDRESS: string;
  REWARD_DISTRIBUTOR_ADDRESS: string;
}
