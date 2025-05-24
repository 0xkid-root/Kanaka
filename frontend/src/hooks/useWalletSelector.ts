import { useState, useCallback } from 'react';
import { useWallet, WalletType } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

export function useWalletSelector() {
  const { connectWallet, disconnectWallet, walletType, isConnected, address } = useWallet();
  const { login, logout, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Connect to a wallet and login
  const connectAndLogin = useCallback(async (type: WalletType) => {
    if (!type) {
      console.error('Please select a wallet type');
      return;
    }

    setIsLoading(true);

    try {
      // First connect the wallet
      await connectWallet(type);
      
      // Then login
      await login(type);
      
      console.log(`Successfully connected with ${type} wallet`);
    } catch (error) {
      console.error('Error connecting wallet and logging in:', error);
    } finally {
      setIsLoading(false);
    }
  }, [connectWallet, login]);

  // Disconnect wallet and logout
  const disconnectAndLogout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // First logout from the backend
      if (isAuthenticated) {
        await logout();
      }
      
      // Then disconnect the wallet
      disconnectWallet();
      
      console.log('Successfully disconnected wallet');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [disconnectWallet, logout, isAuthenticated]);

  return {
    connectAndLogin,
    disconnectAndLogout,
    walletType,
    isConnected,
    isAuthenticated,
    isLoading,
    address,
  };
}