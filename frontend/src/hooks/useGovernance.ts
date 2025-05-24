import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import governanceService from '../services/governanceService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  Proposal, 
  ProposalDetail, 
  Vote, 
  CreateProposalRequest, 
  CastVoteRequest 
} from '../types/governanceTypes';

export function useGovernance() {
  const { isAuthenticated } = useAuth();
  const { addNotification } = useNotification();
  const [activeOnly, setActiveOnly] = useState(false);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Fetch proposals
  const {
    data: proposals,
    isLoading: isLoadingProposals,
    error: proposalsError,
    refetch: refetchProposals
  } = useApi<Proposal[]>({
    method: 'GET',
    url: '/governance/proposals',
    params: { active: activeOnly, limit, offset }
  });

  // Fetch a single proposal
  const fetchProposal = useCallback((id: number) => {
    return useApi<ProposalDetail>({
      method: 'GET',
      url: `/governance/proposals/${id}`,
      immediate: false
    });
  }, []);

  // Fetch votes for a proposal
  const fetchVotes = useCallback((proposalId: number, support?: boolean) => {
    return useApi<Vote[]>({
      method: 'GET',
      url: `/governance/proposals/${proposalId}/votes`,
      params: { support },
      immediate: false
    });
  }, []);

  // Create proposal
  const createProposal = useCallback(async (proposalData: CreateProposalRequest) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to create a proposal',
      });
      throw new Error('Authentication required');
    }
    
    try {
      const response = await governanceService.createProposal(proposalData);
      
      addNotification({
        type: 'success',
        title: 'Proposal Created',
        message: 'Your proposal has been successfully created',
      });
      
      await refetchProposals();
      return response.data;
    } catch (error) {
      console.error('Error creating proposal:', error);
      
      addNotification({
        type: 'error',
        title: 'Proposal Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create proposal',
      });
      
      throw error;
    }
  }, [isAuthenticated, refetchProposals, addNotification]);

  // Cast vote
  const castVote = useCallback(async (proposalId: number, voteData: CastVoteRequest) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to vote',
      });
      throw new Error('Authentication required');
    }
    
    try {
      const response = await governanceService.castVote(proposalId, voteData);
      
      addNotification({
        type: 'success',
        title: 'Vote Cast',
        message: 'Your vote has been successfully cast',
      });
      
      await refetchProposals();
      return response.data;
    } catch (error) {
      console.error('Error casting vote:', error);
      
      addNotification({
        type: 'error',
        title: 'Vote Failed',
        message: error instanceof Error ? error.message : 'Failed to cast vote',
      });
      
      throw error;
    }
  }, [isAuthenticated, refetchProposals, addNotification]);

  // Execute proposal
  const executeProposal = useCallback(async (proposalId: number) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to execute a proposal',
      });
      throw new Error('Authentication required');
    }
    
    try {
      const response = await governanceService.executeProposal(proposalId);
      
      addNotification({
        type: 'success',
        title: 'Proposal Executed',
        message: 'The proposal has been successfully executed',
      });
      
      await refetchProposals();
      return response.data;
    } catch (error) {
      console.error('Error executing proposal:', error);
      
      addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: error instanceof Error ? error.message : 'Failed to execute proposal',
      });
      
      throw error;
    }
  }, [isAuthenticated, refetchProposals, addNotification]);

  // Cancel proposal
  const cancelProposal = useCallback(async (proposalId: number) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to cancel a proposal',
      });
      throw new Error('Authentication required');
    }
    
    try {
      const response = await governanceService.cancelProposal(proposalId);
      
      addNotification({
        type: 'success',
        title: 'Proposal Canceled',
        message: 'The proposal has been successfully canceled',
      });
      
      await refetchProposals();
      return response.data;
    } catch (error) {
      console.error('Error canceling proposal:', error);
      
      addNotification({
        type: 'error',
        title: 'Cancellation Failed',
        message: error instanceof Error ? error.message : 'Failed to cancel proposal',
      });
      
      throw error;
    }
  }, [isAuthenticated, refetchProposals, addNotification]);

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

  const toggleActiveOnly = useCallback(() => {
    setActiveOnly(prev => !prev);
    setOffset(0); // Reset to first page when toggling filter
  }, []);

  return {
    proposals,
    isLoadingProposals,
    proposalsError,
    fetchProposal,
    fetchVotes,
    createProposal,
    castVote,
    executeProposal,
    cancelProposal,
    refetchProposals,
    pagination: {
      limit,
      offset,
      nextPage,
      prevPage,
      changeLimit,
    },
    filters: {
      activeOnly,
      toggleActiveOnly,
    },
  };
}