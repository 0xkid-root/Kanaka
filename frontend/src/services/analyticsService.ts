import { request } from './api';
import { 
  AnalyticsMetrics, 
  YieldCurve, 
  PoolMetrics, 
  UserStats 
} from '../types/analyticsTypes';

const analyticsService = {
  /**
   * Get general analytics metrics
   */
  getMetrics: (params?: { period?: 'day' | 'week' | 'month' | 'year' }) => 
    request<AnalyticsMetrics>({
      method: 'GET',
      url: '/analytics/metrics',
      params
    }),
  
  /**
   * Get yield curve data
   */
  getYieldCurve: () => 
    request<YieldCurve>({
      method: 'GET',
      url: '/analytics/yield-curve'
    }),
  
  /**
   * Get metrics for a specific pool
   */
  getPoolMetrics: (poolId: string) => 
    request<PoolMetrics>({
      method: 'GET',
      url: `/analytics/pool-metrics/${poolId}`
    }),
  
  /**
   * Get metrics for all pools
   */
  getAllPoolMetrics: () => 
    request<PoolMetrics[]>({
      method: 'GET',
      url: '/analytics/pool-metrics'
    }),
  
  /**
   * Get user statistics
   */
  getUserStats: () => 
    request<UserStats>({
      method: 'GET',
      url: '/analytics/user-stats'
    }),
  
  /**
   * Get historical TVL data
   */
  getHistoricalTvl: (params?: { days?: number }) => 
    request<{ timestamp: string; tvl: number }[]>({
      method: 'GET',
      url: '/analytics/historical-tvl',
      params
    }),
  
  /**
   * Get protocol fee data
   */
  getProtocolFees: (params?: { period?: 'day' | 'week' | 'month' | 'year' }) => 
    request<{ total: string; breakdown: { [key: string]: string } }>({
      method: 'GET',
      url: '/analytics/protocol-fees',
      params
    }),
};

export default analyticsService;