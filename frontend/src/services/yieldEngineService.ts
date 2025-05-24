import { request } from './api';
import { PoolWeight, YieldHarvest } from '../types/yieldTypes';

const yieldEngineService = {
  /**
   * Get all pool weights
   */
  getPoolWeights: () => 
    request<PoolWeight[]>({
      method: 'GET',
      url: '/yield-engine/pool-weights'
    }),
  
  /**
   * Get yield harvests with pagination
   */
  getYieldHarvests: (params?: { limit?: number; offset?: number }) => 
    request<YieldHarvest[]>({
      method: 'GET',
      url: '/yield-engine/yield-harvests',
      params
    }),
  
  /**
   * Get yield harvest by ID
   */
  getYieldHarvest: (id: number) => 
    request<YieldHarvest>({
      method: 'GET',
      url: `/yield-engine/yield-harvests/${id}`
    }),
  
  /**
   * Get total yield for a specific period
   */
  getTotalYield: (params: { period: 'day' | 'week' | 'month' | 'year' }) => 
    request<{ amount: string }>({
      method: 'GET',
      url: '/yield-engine/total-yield',
      params
    }),
  
  /**
   * Get APY for all pools
   */
  getPoolsApy: () => 
    request<{ poolId: string; apy: number }[]>({
      method: 'GET',
      url: '/yield-engine/pools-apy'
    }),
};

export default yieldEngineService;