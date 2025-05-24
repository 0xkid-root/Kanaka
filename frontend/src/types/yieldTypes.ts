export interface PoolWeight {
  id: number;
  poolId: string;
  weight: number;
  timestamp: string;
}

export interface YieldHarvest {
  id: number;
  poolId: string;
  amount: string;
  timestamp: string;
  txHash: string;
  totalSupply?: string;
}

export interface YieldEngineState {
  poolWeights: PoolWeight[];
  yieldHarvests: YieldHarvest[];
  totalYield: string;
  isLoading: boolean;
  error: string | null;
}

export type YieldEngineAction =
  | { type: 'FETCH_POOL_WEIGHTS_REQUEST' }
  | { type: 'FETCH_POOL_WEIGHTS_SUCCESS'; payload: { poolWeights: PoolWeight[] } }
  | { type: 'FETCH_POOL_WEIGHTS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_YIELD_HARVESTS_REQUEST' }
  | { type: 'FETCH_YIELD_HARVESTS_SUCCESS'; payload: { yieldHarvests: YieldHarvest[] } }
  | { type: 'FETCH_YIELD_HARVESTS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_TOTAL_YIELD_REQUEST'; payload: { period: 'day' | 'week' | 'month' | 'year' } }
  | { type: 'FETCH_TOTAL_YIELD_SUCCESS'; payload: { amount: string } }
  | { type: 'FETCH_TOTAL_YIELD_FAILURE'; payload: { error: string } };