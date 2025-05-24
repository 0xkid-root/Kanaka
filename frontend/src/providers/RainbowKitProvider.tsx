import React, { ReactNode } from 'react';
import {
  RainbowKitProvider as RainbowKit,
  getDefaultWallets,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { mainnet, goerli } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import '@rainbow-me/rainbowkit/styles.css';

interface RainbowKitProviderProps {
  children: ReactNode;
  isDarkMode?: boolean;
}

// Configure chains & providers
const { chains, provider } = configureChains(
  [mainnet, goerli],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '' }),
    publicProvider(),
  ]
);

// Set up connectors
const { connectors } = getDefaultWallets({
  appName: 'Kanaka Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  chains,
});

// Create wagmi client
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

export const RainbowKitProvider: React.FC<RainbowKitProviderProps> = ({ 
  children,
  isDarkMode = false,
}) => {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKit
        chains={chains}
        theme={isDarkMode ? darkTheme() : lightTheme()}
        modalSize="compact"
      >
        {children}
      </RainbowKit>
    </WagmiConfig>
  );
};

export default RainbowKitProvider;