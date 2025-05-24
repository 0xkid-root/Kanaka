export interface IMetric {
  id: number;
  poolId: number;
  timestamp: Date;
  yield: number;
  volatility: number;
  modeledYield: number;
  score: number;
}

export interface ICorrelation {
  id: number;
  poolIdA: number;
  poolIdB: number;
  timestamp: Date;
  correlation: number;
}

export interface ICDR {
  id: number;
  timestamp: Date;
  value: number;
  portfolioVolatility: number;
  averageCorrelation: number;
}

export interface IYieldCurve {
  poolId: number;
  timePoints: number[];
  yieldPoints: number[];
  modelParams: {
    a: number;
    b: number;
    c: number;
  };
}
