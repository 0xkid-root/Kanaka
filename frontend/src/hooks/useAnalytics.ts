import { useCallback } from 'react';
import { useApi } from './useApi';
import analyticsService from '../services/analyticsService';
import { 
  AnalyticsMetrics, 
  YieldCurve, 
  PoolMetrics, 
  UserStats 
} from '../types/analyticsTypes';

export function useAnalytics() {
  // Fetch general metrics
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
    execute: fetchMetrics
  } = useApi<AnalyticsMetrics>({
    method: 'GET',
    url: '/analytics/metrics'
  });

  // Fetch yield curve
  const {
    data: yieldCurve,
    isLoading: isLoadingYieldCurve,
    error: yieldCurveError,
    refetch: refetchYieldCurve
  } = useApi<YieldCurve>({
    method: 'GET',
    url: '/analytics/yield-curve'
  });

  // Fetch all pool metrics
  const {
    data: poolMetrics,
    isLoading: isLoadingPoolMetrics,
    error: poolMetricsError,
    refetch: refetchPoolMetrics
  } = useApi<PoolMetrics[]>({
    method: 'GET',
    url: '/analytics/pool-metrics'
  });

  // Fetch user stats
  const {
    data: userStats,
    isLoading: isLoadingUserStats,
    error: userStatsError,
    refetch: refetchUserStats
  } = useApi<UserStats>({
    method: 'GET',
    url: '/analytics/user-stats'
  });

  // Fetch historical TVL
  const fetchHistoricalTvl = useCallback((days: number = 30) => {
    return useApi<{ timestamp: string; tvl: number }[]>({
      method: 'GET',
      url: '/analytics/historical-tvl',
      params: { days },
      immediate: false
    });
  }, []);

  // Fetch protocol fees
  const fetchProtocolFees = useCallback((period: 'day' | 'week' | 'month' | 'year' = 'month') => {
    return useApi<{ total: string; breakdown: { [key: string]: string } }>({
      method: 'GET',
      url: '/analytics/protocol-fees',
      params: { period },
      immediate: false
    });
  }, []);

  // Fetch metrics for a specific period
  const fetchMetricsForPeriod = useCallback((period: 'day' | 'week' | 'month' | 'year') => {
    return fetchMetrics({
      params: { period }
    });
  }, [fetchMetrics]);

  // Fetch metrics for a specific pool
  const fetchPoolMetrics = useCallback((poolId: string) => {
    return useApi<PoolMetrics>({
      method: 'GET',
      url: `/analytics/pool-metrics/${poolId}`,
      immediate: false
    });
  }, []);

  return {
    metrics,
    isLoadingMetrics,
    metricsError,
    refetchMetrics,
    fetchMetricsForPeriod,
    
    yieldCurve,
    isLoadingYieldCurve,
    yieldCurveError,
    refetchYieldCurve,
    
    poolMetrics,
    isLoadingPoolMetrics,
    poolMetricsError,
    refetchPoolMetrics,
    fetchPoolMetrics,
    
    userStats,
    isLoadingUserStats,
    userStatsError,
    refetchUserStats,
    
    fetchHistoricalTvl,
    fetchProtocolFees,
  };
}