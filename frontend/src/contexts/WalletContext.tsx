import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useSignMessage, useDisconnect, useConnect } from 'wagmi';
import { Provider, ProviderInterface } from 'starknet';
import { AccountInterface } from 'starknet';
import { InjectedConnector } from 'wagmi/connectors/injected';

export type WalletType = 'ethereum' | 'starknet';

interface WalletContextType {
  // Common wallet properties
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletType: WalletType | null;
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: string) => Promise<string>;
  error: Error | null;
  
  // Starknet specific
  starknetAccount: AccountInterface | null;
  starknetProvider: ProviderInterface | null;
  
  // Ethereum specific
  ethereumChainId?: number;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  walletType: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  signMessage: async () => '',
  error: null,
  starknetAccount: null,
  starknetProvider: null,
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Common state
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  
  // Starknet state
  const [starknetAccount, setStarknetAccount] = useState<AccountInterface | null>(null);
  const [starknetProvider, setStarknetProvider] = useState<ProviderInterface | null>(null);
  
  // Rainbow/wagmi hooks
  const { address: ethereumAddress, isConnected: isEthereumConnected, chainId } = useAccount();
  const { disconnect: disconnectEthereum } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { connect: connectEthereum } = useConnect({
    connector: new InjectedConnector(),
  });

  // Initialize Starknet provider on mount
  useEffect(() => {
    const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK || 'goerli-alpha';
    const provider = new Provider({ network });
    setStarknetProvider(provider);
  }, []);

  // Check for existing Starknet connection on mount
  useEffect(() => {
    const checkStarknetConnection = async () => {
      try {
        const starknet = window.starknet;
        if (starknet && starknet.isConnected) {
          setAddress(starknet.selectedAddress);
          setStarknetAccount(starknet.account);
          setWalletType('starknet');
        }
      } catch (error) {
        console.error('Error checking Starknet connection:', error);
      }
    };

    if (typeof window !== 'undefined' && window.starknet) {
      checkStarknetConnection();
    }
  }, []);

  // Update state when Ethereum wallet connects/disconnects
  useEffect(() => {
    if (isEthereumConnected && ethereumAddress) {
      setAddress(ethereumAddress);
      setWalletType('ethereum');
    } else if (walletType === 'ethereum') {
      // Only reset if we were using an Ethereum wallet
      setAddress(null);
      setWalletType(null);
    }
  }, [isEthereumConnected, ethereumAddress, walletType]);

  // Connect wallet function
  const connectWallet = async (type: WalletType) => {
    if (!type) {
      throw new Error('Wallet type must be specified');
    }
    
    setIsConnecting(true);
    setError(null);

    try {
      if (type === 'starknet') {
        if (!window.starknet) {
          throw new Error('Starknet wallet not found. Please install ArgentX or Braavos extension.');
        }

        const starknet = window.starknet;
        await starknet.enable();
        
        setStarknetAccount(starknet.account);
        setAddress(starknet.selectedAddress);
        setWalletType('starknet');
      } else if (type === 'ethereum') {
        await connectEthereum();
        // The address and wallet type will be set by the useEffect hook
      }
    } catch (error) {
      console.error(`Error connecting ${type} wallet:`, error);
      setError(error instanceof Error ? error : new Error(`Failed to connect ${type} wallet`));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    if (walletType === 'ethereum') {
      disconnectEthereum();
    } else if (walletType === 'starknet') {
      setStarknetAccount(null);
      setAddress(null);
      setWalletType(null);
    }
  };

  // Sign message function
  const signMessage = async (message: string): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      if (walletType === 'starknet') {
        if (!starknetAccount) {
          throw new Error('Starknet account not available');
        }
        const signature = await starknetAccount.signMessage(message);
        return JSON.stringify(signature);
      } else if (walletType === 'ethereum') {
        const signature = await signMessageAsync({ message });
        return signature;
      } else {
        throw new Error('Unknown wallet type');
      }
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        walletType,
        connectWallet,
        disconnectWallet,
        signMessage,
        error,
        starknetAccount,
        starknetProvider,
        ethereumChainId: chainId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Add type declaration for window.starknet
declare global {
  interface Window {
    starknet?: any;
  }
}