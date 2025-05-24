import React, { ReactNode } from 'react';
import { RainbowKitProvider } from './RainbowKitProvider';
import { WalletProvider } from '../contexts/WalletContext';
import { AuthProvider } from '../contexts/AuthContext';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <RainbowKitProvider>
      <WalletProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </WalletProvider>
    </RainbowKitProvider>
  );
};

export default AppProviders;