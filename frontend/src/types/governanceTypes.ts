export interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  forVotes: string;
  againstVotes: string;
  executed: boolean;
  canceled: boolean;
}

export interface ProposalDetail extends Proposal {
  actions?: ProposalAction[];
  votes?: Vote[];
}

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

export interface Vote {
  id: number;
  proposalId: number;
  voter: string;
  support: boolean;
  votes: string;
  reason: string | null;
  timestamp: string;
}

export interface CreateProposalRequest {
  title: string;
  description: string;
  actions?: ProposalAction[];
}

export interface CastVoteRequest {
  support: boolean;
  reason?: string;
}

export interface GovernanceState {
  proposals: Proposal[];
  selectedProposal: ProposalDetail | null;
  votes: Vote[];
  isLoading: boolean;
  error: string | null;
}

export type GovernanceAction =
  | { type: 'FETCH_PROPOSALS_REQUEST' }
  | { type: 'FETCH_PROPOSALS_SUCCESS'; payload: { proposals: Proposal[] } }
  | { type: 'FETCH_PROPOSALS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_PROPOSAL_REQUEST'; payload: { id: number } }
  | { type: 'FETCH_PROPOSAL_SUCCESS'; payload: { proposal: ProposalDetail } }
  | { type: 'FETCH_PROPOSAL_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_VOTES_REQUEST'; payload: { proposalId: number } }
  | { type: 'FETCH_VOTES_SUCCESS'; payload: { votes: Vote[] } }
  | { type: 'FETCH_VOTES_FAILURE'; payload: { error: string } }
  | { type: 'CREATE_PROPOSAL_REQUEST'; payload: { proposal: CreateProposalRequest } }
  | { type: 'CREATE_PROPOSAL_SUCCESS'; payload: { proposal: Proposal } }
  | { type: 'CREATE_PROPOSAL_FAILURE'; payload: { error: string } }
  | { type: 'CAST_VOTE_REQUEST'; payload: { proposalId: number; vote: CastVoteRequest } }
  | { type: 'CAST_VOTE_SUCCESS'; payload: { vote: Vote } }
  | { type: 'CAST_VOTE_FAILURE'; payload: { error: string } };