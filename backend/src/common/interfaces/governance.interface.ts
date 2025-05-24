export interface IProposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  startTime: Date;
  endTime: Date;
  yesVotes: number;
  noVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVote {
  id: number;
  proposalId: number;
  voter: string;
  weight: number;
  vote: 'yes' | 'no';
  timestamp: Date;
}

export interface ICreateProposal {
  title: string;
  description: string;
  userAddress: string;
}

export interface ISubmitVote {
  proposalId: number;
  userAddress: string;
  voteWeight: number;
  vote: 'yes' | 'no';
}
