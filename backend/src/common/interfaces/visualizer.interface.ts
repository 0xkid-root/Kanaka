export interface IMetricsResponse {
  timestamp: Date;
  cdr: number;
  portfolioVolatility: number;
  averageCorrelation: number;
  pools: IPoolMetrics[];
  yieldCurves: IYieldCurve[];
  correlationMatrix: ICorrelationMatrix;
  allocationChart: IAllocationChart;
}

export interface IPoolMetrics {
  id: number;
  name: string;
  currentYield: number;
  modeledYield: number;
  volatility: number;
  score: number;
  weight: number;
}

export interface IYieldCurve {
  poolId: number;
  poolName: string;
  timePoints: number[];
  yieldPoints: number[];
  modelParams: {
    a: number; // asymptotic long-term yield
    b: number; // initial deviation
    c: number; // rate of decay
  };
}

export interface ICorrelationMatrix {
  poolIds: number[];
  poolNames: string[];
  correlations: number[][];
}

export interface IAllocationChart {
  poolIds: number[];
  poolNames: string[];
  weights: number[];
  colors: string[];
}
