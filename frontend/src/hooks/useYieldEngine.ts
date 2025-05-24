import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import yieldEngineService from '../services/yieldEngineService';
import { PoolWeight, YieldHarvest } from '../types/yieldTypes';
import { calculateApy } from '../utils/calculations';

export function useYieldEngine() {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Fetch pool weights
  const {
    data: poolWeights,
    isLoading: isLoadingPoolWeights,
    error: poolWeightsError,
    refetch: refetchPoolWeights
  } = useApi<PoolWeight[]>({
    method: 'GET',
    url: '/yield-engine/pool-weights'
  });

  // Fetch yield harvests
  const {
    data: yieldHarvests,
    isLoading: isLoadingYieldHarvests,
    error: yieldHarvestsError,
    refetch: refetchYieldHarvests
  } = useApi<YieldHarvest[]>({
    method: 'GET',
    url: '/yield-engine/yield-harvests',
    params: { limit, offset }
  });

  // Fetch total yield
  const fetchTotalYield = useCallback((period: 'day' | 'week' | 'month' | 'year') => {
    return useApi<{ amount: string }>({
      method: 'GET',
      url: '/yield-engine/total-yield',
      params: { period },
      immediate: false
    });
  }, []);

  // Fetch pools APY
  const {
    data: poolsApy,
    isLoading: isLoadingPoolsApy,
    error: poolsApyError,
    refetch: refetchPoolsApy
  } = useApi<{ poolId: string; apy: number }[]>({
    method: 'GET',
    url: '/yield-engine/pools-apy'
  });

  // Pagination controls
  const nextPage = useCallback(() => {
    setOffset(prev => prev + limit);
  }, [limit]);

  const prevPage = useCallback(() => {
    setOffset(prev => Math.max(0, prev - limit));
  }, [limit]);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setOffset(0); // Reset to first page when changing limit
  }, []);

  // Calculate total yield from harvests
  const calculateTotalYield = useCallback(() => {
    if (!yieldHarvests) return '0';
    
    return yieldHarvests.reduce((total, harvest) => {
      const harvestAmount = parseFloat(harvest.amount);
      return total + harvestAmount;
    }, 0).toString();
  }, [yieldHarvests]);

  // Calculate APY from harvests
  const calculateCurrentApy = useCallback(() => {
    if (!yieldHarvests || yieldHarvests.length === 0 || !poolsApy) return 0;
    
    // If we have the APY data from the API, use the average
    if (poolsApy.length > 0) {
      const totalApy = poolsApy.reduce((sum, pool) => sum + pool.apy, 0);
      return totalApy / poolsApy.length;
    }
    
    // Otherwise calculate from harvests (simplified)
    const totalYield = parseFloat(calculateTotalYield());
    const latestHarvest = yieldHarvests[0];
    
    if (!latestHarvest.totalSupply) return 0;
    
    const totalSupply = parseFloat(latestHarvest.totalSupply);
    
    // Calculate APY based on the last 7 days of harvests (if available)
    const harvestsToUse = yieldHarvests.slice(0, Math.min(7, yieldHarvests.length));
    const periodDays = harvestsToUse.length;
    
    return calculateApy(totalYield, totalSupply, periodDays);
  }, [yieldHarvests, poolsApy, calculateTotalYield]);

  return {
    poolWeights,
    isLoadingPoolWeights,
    poolWeightsError,
    refetchPoolWeights,
    
    yieldHarvests,
    isLoadingYieldHarvests,
    yieldHarvestsError,
    refetchYieldHarvests,
    
    poolsApy,
    isLoadingPoolsApy,
    poolsApyError,
    refetchPoolsApy,
    
    fetchTotalYield,
    
    pagination: {
      limit,
      offset,
      nextPage,
      prevPage,
      changeLimit,
    },
    
    analytics: {
      calculateTotalYield,
      calculateCurrentApy,
    },
  };
}