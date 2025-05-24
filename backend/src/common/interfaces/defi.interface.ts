export interface IPool {
  id: number;
  name: string;
  address: string;
  protocol: string;
  yieldModel: IYieldModel;
  currentYield: number;
  volatility: number;
  score: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IYieldModel {
  a: number; // asymptotic long-term yield
  b: number; // initial deviation
  c: number; // rate of decay
}

export interface ITransaction {
  id: number;
  userId: number;
  poolId: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  transactionHash: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeposit {
  userAddress: string;
  amount: number;
  pool: string;
}

export interface IWithdraw {
  userAddress: string;
  amount: number;
  pool: string;
}
