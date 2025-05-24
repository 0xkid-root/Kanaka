export interface Vault {
  poolId: string;
  token: string;
  totalSupply: string;
  apy: number;
  active: boolean;
}

export interface VaultDetail extends Vault {
  description?: string;
  strategy?: string;
  performanceHistory?: {
    timestamp: string;
    apy: number;
  }[];
  fees?: {
    deposit: number;
    withdrawal: number;
    performance: number;
  };
}

export interface PoolBalance {
  poolId: string;
  balance: string;
  totalSupply: string;
  token: string;
}

export interface DepositRequest {
  poolId: string;
  amount: string;
}

export interface WithdrawRequest {
  poolId: string;
  amount: string;
}

export interface VaultPerformance {
  vaultId: string;
  tvl: number;
  apy: number;
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  totalFees: number;
  currentStrategy: string;
  performanceScore: number;
  lastRebalanced: string;
}

export interface VaultState {
  vaults: Vault[];
  selectedVault: VaultDetail | null;
  userBalances: Record<string, PoolBalance>;
  isLoading: boolean;
  error: string | null;
}

export type VaultAction =
  | { type: 'FETCH_VAULTS_REQUEST' }
  | { type: 'FETCH_VAULTS_SUCCESS'; payload: { vaults: Vault[] } }
  | { type: 'FETCH_VAULTS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_VAULT_REQUEST'; payload: { id: string } }
  | { type: 'FETCH_VAULT_SUCCESS'; payload: { vault: VaultDetail } }
  | { type: 'FETCH_VAULT_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_BALANCE_REQUEST'; payload: { poolId: string } }
  | { type: 'FETCH_BALANCE_SUCCESS'; payload: { balance: PoolBalance } }
  | { type: 'FETCH_BALANCE_FAILURE'; payload: { error: string } }
  | { type: 'DEPOSIT_REQUEST'; payload: { deposit: DepositRequest } }
  | { type: 'DEPOSIT_SUCCESS'; payload: { txHash: string; poolId: string } }
  | { type: 'DEPOSIT_FAILURE'; payload: { error: string } }
  | { type: 'WITHDRAW_REQUEST'; payload: { withdraw: WithdrawRequest } }
  | { type: 'WITHDRAW_SUCCESS'; payload: { txHash: string; poolId: string } }
  | { type: 'WITHDRAW_FAILURE'; payload: { error: string } };