import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useWallet, WalletType } from './WalletContext';
import authService from '../services/authService';
import { AuthState, AuthAction, UserProfile } from '../types/authTypes';

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  walletType: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        walletType: action.payload.walletType,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: action.payload.error,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        walletType: null,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload.user } : null,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (walletType?: WalletType) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { address, isConnected, signMessage, walletType, connectWallet } = useWallet();

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedWalletType = localStorage.getItem('wallet_type') as WalletType | null;
      
      if (token) {
        try {
          // Verify token by fetching user profile
          const response = await authService.getProfile();
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { 
              user: response.data,
              walletType: savedWalletType
            } 
          });
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('wallet_type');
          dispatch({ type: 'LOGIN_FAILURE', payload: { error: 'Invalid token' } });
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: { error: 'No token found' } });
      }
    };

    checkAuth();
  }, []);

  // Listen for auth:expired event
  useEffect(() => {
    const handleAuthExpired = () => {
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  // Login function
  const login = async (preferredWalletType?: WalletType) => {
    // If wallet is not connected, try to connect it first
    if (!isConnected || !address) {
      if (!preferredWalletType) {
        throw new Error('Wallet type must be specified when not connected');
      }
      
      try {
        await connectWallet(preferredWalletType);
      } catch (error) {
        console.error('Wallet connection failed:', error);
        throw error;
      }
    }

    // Use the current wallet type if none specified
    const currentWalletType = preferredWalletType || walletType;
    
    if (!currentWalletType) {
      throw new Error('No wallet type available');
    }

    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      // Create a message to sign
      const timestamp = Date.now();
      const message = `Login to Kanaka Protocol: ${timestamp}`;
      
      // Sign the message with the wallet
      const signature = await signMessage(message);
      
      // Send the signature to the backend
      const response = await authService.login({
        address,
        signature,
        walletType: currentWalletType,
      });
      
      // Store the token and wallet type
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('wallet_type', currentWalletType);
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          user: response.data.user,
          walletType: currentWalletType
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { error: error instanceof Error ? error.message : 'Login failed' } 
      });
      
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove token regardless of API call success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('wallet_type');
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Update user function
  const updateUser = async (userData: Partial<UserProfile>) => {
    try {
      const response = await authService.updateProfile(userData);
      dispatch({ type: 'UPDATE_USER', payload: { user: response.data } });
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};