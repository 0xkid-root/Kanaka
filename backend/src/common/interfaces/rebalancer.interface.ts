export interface IRebalanceHistory {
  id: number;
  timestamp: Date;
  oldWeights: Record<string, number>;
  newWeights: Record<string, number>;
  cdrValue: number;
  thresholdBreached: boolean;
  transactionHash?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface IPortfolioAllocation {
  poolId: number;
  poolName: string;
  weight: number;
  yield: number;
  volatility: number;
  score: number;
}

export interface IRebalanceTrigger {
  manualTrigger: boolean;
  adminAddress?: string;
  reason?: string;
}
