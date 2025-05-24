import { request } from './api';
import { LoginRequest, LoginResponse, UserProfile } from '../types/authTypes';

const authService = {
  /**
   * Login with wallet signature
   * Supports both Ethereum and Starknet wallets
   */
  login: (data: LoginRequest) => 
    request<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data: {
        ...data,
        // Include wallet type in the request
        walletType: data.walletType
      }
    }),
  
  /**
   * Logout current user
   */
  logout: () => 
    request({
      method: 'POST',
      url: '/auth/logout'
    }),
  
  /**
   * Get current user profile
   */
  getProfile: () => 
    request<UserProfile>({
      method: 'GET',
      url: '/user/profile'
    }),
  
  /**
   * Update user profile
   */
  updateProfile: (data: Partial<UserProfile>) => 
    request<UserProfile>({
      method: 'PUT',
      url: '/user/profile',
      data
    }),
  
  /**
   * Verify token is valid
   */
  verifyToken: () => 
    request<{ valid: boolean }>({
      method: 'GET',
      url: '/auth/verify'
    }),
};

export default authService;