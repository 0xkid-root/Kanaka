import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import vaultService from '../services/vaultService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  Vault, 
  VaultDetail, 
  PoolBalance, 
  DepositRequest, 
  WithdrawRequest,
  VaultPerformance
} from '../types/vaultTypes';

export function useVaults() {
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // Fetch all vaults
  const {
    data: vaults,
    isLoading: isLoadingVaults,
    error: vaultsError,
    refetch: refetchVaults
  } = useApi<Vault[]>({
    method: 'GET',
    url: '/vault-manager/vaults'
  });

  // Fetch a specific vault
  const {
    data: selectedVault,
    isLoading: isLoadingSelectedVault,
    error: selectedVaultError,
    execute: fetchVault
  } = useApi<VaultDetail>({
    method: 'GET',
    url: selectedVaultId ? `/vault-manager/vaults/${selectedVaultId}` : '',
    immediate: false
  });

  // Fetch user's balance in a vault
  const fetchBalance = useCallback((poolId: string) => {
    return useApi<PoolBalance>({
      method: 'GET',
      url: `/vault-manager/balance/${poolId}`,
      immediate: false
    });
  }, []);

  // Fetch vault performance
  const fetchPerformance = useCallback((vaultId: string) => {
    return useApi<VaultPerformance>({
      method: 'GET',
      url: `/vault-manager/performance/${vaultId}`,
      immediate: false
    });
  }, []);

  // Fetch historical APY
  const fetchHistoricalApy = useCallback((vaultId: string, days: number = 30) => {
    return useApi<{ timestamp: string; apy: number }[]>({
      method: 'GET',
      url: `/vault-manager/historical-apy/${vaultId}`,
      params: { days },
      immediate: false
    });
  }, []);

  // Select a vault
  const selectVault = useCallback((vaultId: string) => {
    setSelectedVaultId(vaultId);
    fetchVault({
      url: `/vault-manager/vaults/${vaultId}`
    });
  }, [fetchVault]);

  // Deposit assets
  const deposit = useCallback(async (depositData: DepositRequest) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to deposit assets',
      });
      throw new Error('Authentication required');
    }
    
    try {
      const response = await vaultService.deposit(depositData);
      
      addNotification({
        type: 'success',
        title: 'Deposit Successful',
        message: 'Your assets have been successfully deposited',
      });
      
      await refetchVaults();
      return response.data;
    } catch (error) {
      console.error('Error depositing assets:', error);
      
      addNotification({
        type: 'error',
        title: 'Deposit Failed',
        message: error instanceof Error ? error.message : 'Failed to deposit assets',
      });
      
      throw error;
    }
  }, [isAuthenticated, refetchVaults, addNotification]);

  // Withdraw assets
  const withdraw = useCallback(async (withdrawData: WithdrawRequest) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to withdraw assets',
      });
      throw new Error('Authentication required');
    }
    
    try {
      const response = await vaultService.withdraw(withdrawData);
      
      addNotification({
        type: 'success',
        title: 'Withdrawal Successful',
        message: 'Your assets have been successfully withdrawn',
      });
      
      await refetchVaults();
      return response.data;
    } catch (error) {
      console.error('Error withdrawing assets:', error);
      
      addNotification({
        type: 'error',
        title: 'Withdrawal Failed',
        message: error instanceof Error ? error.message : 'Failed to withdraw assets',
      });
      
      throw error;
    }
  }, [isAuthenticated, refetchVaults, addNotification]);

  return {
    vaults,
    isLoadingVaults,
    vaultsError,
    selectedVault,
    isLoadingSelectedVault,
    selectedVaultError,
    selectVault,
    fetchBalance,
    fetchPerformance,
    fetchHistoricalApy,
    deposit,
    withdraw,
    refetchVaults,
  };
}