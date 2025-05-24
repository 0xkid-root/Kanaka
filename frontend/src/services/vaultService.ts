import { request } from './api';
import { 
  Vault, 
  VaultDetail, 
  DepositRequest, 
  WithdrawRequest, 
  PoolBalance, 
  VaultPerformance 
} from '../types/vaultTypes';

const vaultService = {
  /**
   * Get all vaults
   */
  getVaults: () => 
    request<Vault[]>({
      method: 'GET',
      url: '/vault-manager/vaults'
    }),
  
  /**
   * Get a specific vault by ID
   */
  getVault: (id: string) => 
    request<VaultDetail>({
      method: 'GET',
      url: `/vault-manager/vaults/${id}`
    }),
  
  /**
   * Get user's balance in a specific vault
   */
  getBalance: (poolId: string) => 
    request<PoolBalance>({
      method: 'GET',
      url: `/vault-manager/balance/${poolId}`
    }),
  
  /**
   * Deposit assets into a vault
   */
  deposit: (data: DepositRequest) => 
    request<{ txHash: string }>({
      method: 'POST',
      url: '/vault-manager/deposit',
      data
    }),
  
  /**
   * Withdraw assets from a vault
   */
  withdraw: (data: WithdrawRequest) => 
    request<{ txHash: string }>({
      method: 'POST',
      url: '/vault-manager/withdraw',
      data
    }),
  
  /**
   * Get vault performance metrics
   */
  getPerformance: (vaultId: string) => 
    request<VaultPerformance>({
      method: 'GET',
      url: `/vault-manager/performance/${vaultId}`
    }),
  
  /**
   * Get historical APY for a vault
   */
  getHistoricalApy: (vaultId: string, params?: { days?: number }) => 
    request<{ timestamp: string; apy: number }[]>({
      method: 'GET',
      url: `/vault-manager/historical-apy/${vaultId}`,
      params
    }),
};

export default vaultService;