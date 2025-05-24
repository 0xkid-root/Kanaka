import React from 'react';
import { useWalletSelector } from '../hooks/useWalletSelector';
import { WalletType } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { 
    connectAndLogin, 
    disconnectAndLogout, 
    isConnected, 
    isAuthenticated, 
    walletType, 
    address,
    isLoading 
  } = useWalletSelector();
  
  const { user } = useAuth();

  const handleConnect = async (type: WalletType) => {
    await connectAndLogin(type);
  };

  const handleDisconnect = async () => {
    await disconnectAndLogout();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Kanaka Protocol</h1>
      
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
        
        {isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-md">
              <p className="font-medium">Connected Wallet:</p>
              <p className="text-sm break-all">{address}</p>
              <p className="text-sm mt-2">Type: {walletType}</p>
              <p className="text-sm mt-1">
                Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </p>
              
              {isAuthenticated && user && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="font-medium">User Info:</p>
                  <p className="text-sm">ID: {user.id}</p>
                  <p className="text-sm">Roles: {user.roles?.join(', ')}</p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Disconnecting...' : 'Disconnect Wallet'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Choose your wallet type to connect and authenticate with the Kanaka Protocol.
            </p>
            
            <button
              onClick={() => handleConnect('ethereum')}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect with Rainbow Wallet'}
            </button>
            
            <button
              onClick={() => handleConnect('starknet')}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect with Starknet Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}