export interface AnalyticsMetrics {
  tvl: string;
  totalUsers: number;
  totalTransactions: number;
  averageApy: number;
  totalYield: string;
  protocolFees: string;
  activeVaults: number;
}

export interface YieldCurve {
  timestamps: string[];
  yields: number[];
}

export interface PoolMetrics {
  poolId: string;
  tvl: string;
  apy: number;
  utilization: number;
  userCount: number;
  transactionCount: number;
  yieldGenerated: string;
  fees: string;
}

export interface UserStats {
  totalDeposits: string;
  totalWithdrawals: string;
  netPosition: string;
  totalYieldEarned: string;
  averageApy: number;
  activePools: number;
  transactionCount: number;
}

export interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  yieldCurve: YieldCurve | null;
  poolMetrics: PoolMetrics[];
  userStats: UserStats | null;
  historicalTvl: { timestamp: string; tvl: number }[];
  isLoading: boolean;
  error: string | null;
}

export type AnalyticsAction =
  | { type: 'FETCH_METRICS_REQUEST' }
  | { type: 'FETCH_METRICS_SUCCESS'; payload: { metrics: AnalyticsMetrics } }
  | { type: 'FETCH_METRICS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_YIELD_CURVE_REQUEST' }
  | { type: 'FETCH_YIELD_CURVE_SUCCESS'; payload: { yieldCurve: YieldCurve } }
  | { type: 'FETCH_YIELD_CURVE_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_POOL_METRICS_REQUEST' }
  | { type: 'FETCH_POOL_METRICS_SUCCESS'; payload: { poolMetrics: PoolMetrics[] } }
  | { type: 'FETCH_POOL_METRICS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_USER_STATS_REQUEST' }
  | { type: 'FETCH_USER_STATS_SUCCESS'; payload: { userStats: UserStats } }
  | { type: 'FETCH_USER_STATS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_HISTORICAL_TVL_REQUEST' }
  | { type: 'FETCH_HISTORICAL_TVL_SUCCESS'; payload: { historicalTvl: { timestamp: string; tvl: number }[] } }
  | { type: 'FETCH_HISTORICAL_TVL_FAILURE'; payload: { error: string } };