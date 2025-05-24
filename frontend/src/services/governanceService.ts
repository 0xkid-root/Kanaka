import { request } from './api';
import { 
  Proposal, 
  ProposalDetail, 
  Vote, 
  CreateProposalRequest, 
  CastVoteRequest 
} from '../types/governanceTypes';

const governanceService = {
  /**
   * Get all proposals with optional filtering
   */
  getProposals: (params?: { active?: boolean; limit?: number; offset?: number }) => 
    request<Proposal[]>({
      method: 'GET',
      url: '/governance/proposals',
      params
    }),
  
  /**
   * Get a specific proposal by ID
   */
  getProposal: (id: number) => 
    request<ProposalDetail>({
      method: 'GET',
      url: `/governance/proposals/${id}`
    }),
  
  /**
   * Get votes for a specific proposal
   */
  getVotes: (id: number, params?: { support?: boolean }) => 
    request<Vote[]>({
      method: 'GET',
      url: `/governance/proposals/${id}/votes`,
      params
    }),
  
  /**
   * Create a new proposal
   */
  createProposal: (data: CreateProposalRequest) => 
    request<Proposal>({
      method: 'POST',
      url: '/governance/proposals',
      data
    }),
  
  /**
   * Cast a vote on a proposal
   */
  castVote: (id: number, data: CastVoteRequest) => 
    request<Vote>({
      method: 'POST',
      url: `/governance/proposals/${id}/vote`,
      data
    }),
  
  /**
   * Execute a proposal (admin only)
   */
  executeProposal: (id: number) => 
    request<Proposal>({
      method: 'POST',
      url: `/governance/proposals/${id}/execute`
    }),
  
  /**
   * Cancel a proposal (admin only)
   */
  cancelProposal: (id: number) => 
    request<Proposal>({
      method: 'POST',
      url: `/governance/proposals/${id}/cancel`
    }),
};

export default governanceService;