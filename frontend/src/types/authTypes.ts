import { WalletType } from '../contexts/WalletContext';

export interface LoginRequest {
  address: string;
  signature: string;
  walletType: WalletType;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  address: string;
  username?: string;
  email?: string;
  avatar?: string;
  roles: string[];
  walletType?: WalletType;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;
  walletType: WalletType | null;
}

export type AuthAction = 
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: UserProfile } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: { user: Partial<UserProfile> } };