#[contract]
mod Governance {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use zeroable::Zeroable;
    use traits::Into;
    use traits::TryInto;
    use option::OptionTrait;

    struct Storage {
        proposals: LegacyMap::<u256, Proposal>,
        votes: LegacyMap::<(u256, ContractAddress), Vote>,
        proposal_count: u256,
        token: ContractAddress,
        reward_distributor: ContractAddress,
        quorum: u256,
        voting_period: u64,
    }

    struct Proposal {
        id: u256,
        proposer: ContractAddress,
        description: felt252,
        start_time: u64,
        end_time: u64,
        for_votes: u256,
        against_votes: u256,
        executed: bool,
        canceled: bool,
    }

    struct Vote {
        support: bool,
        votes: u256,
    }

    #[event]
    fn ProposalCreated(
        id: u256,
        proposer: ContractAddress,
        description: felt252,
        start_time: u64,
        end_time: u64
    ) {}

    #[event]
    fn VoteCast(voter: ContractAddress, proposal_id: u256, support: bool, votes: u256) {}

    #[event]
    fn ProposalExecuted(id: u256) {}

    #[event]
    fn ProposalCanceled(id: u256) {}

    #[constructor]
    fn constructor(
        token_address: ContractAddress,
        reward_distributor_address: ContractAddress,
        initial_quorum: u256,
        initial_voting_period: u64
    ) {
        token::write(token_address);
        reward_distributor::write(reward_distributor_address);
        quorum::write(initial_quorum);
        voting_period::write(initial_voting_period);
        proposal_count::write(0);
    }

    #[external]
    fn propose(description: felt252) -> u256 {
        let caller = get_caller_address();
        let proposer_balance = IERC20Dispatcher {
            contract_address: token::read()
        }.balance_of(caller);
        
        assert(proposer_balance > 0, 'INSUFFICIENT_BALANCE');

        let proposal_id = proposal_count::read();
        let start_time = starknet::get_block_timestamp();
        let end_time = start_time + voting_period::read();

        let proposal = Proposal {
            id: proposal_id,
            proposer: caller,
            description,
            start_time,
            end_time,
            for_votes: 0,
            against_votes: 0,
            executed: false,
            canceled: false,
        };

        proposals::write(proposal_id, proposal);
        proposal_count::write(proposal_id + 1);

        // Distribute rewards for proposal creation
        IRewardDistributorDispatcher {
            contract_address: reward_distributor::read()
        }.distribute_reward(caller, 100_000); // 100 tokens

        ProposalCreated(proposal_id, caller, description, start_time, end_time);
        proposal_id
    }

    #[external]
    fn cast_vote(proposal_id: u256, support: bool) {
        let caller = get_caller_address();
        let proposal = proposals::read(proposal_id);
        
        assert(!proposal.executed && !proposal.canceled, 'INVALID_PROPOSAL_STATE');
        assert(
            starknet::get_block_timestamp() >= proposal.start_time &&
            starknet::get_block_timestamp() <= proposal.end_time,
            'INVALID_VOTING_TIME'
        );

        let voter_balance = IERC20Dispatcher {
            contract_address: token::read()
        }.balance_of(caller);
        assert(voter_balance > 0, 'NO_VOTING_POWER');

        // Check if already voted
        let previous_vote = votes::read((proposal_id, caller));
        assert(previous_vote.votes == 0, 'ALREADY_VOTED');

        let vote = Vote { support, votes: voter_balance };
        votes::write((proposal_id, caller), vote);

        // Update proposal votes
        let mut proposal = proposals::read(proposal_id);
        if support {
            proposal.for_votes += voter_balance;
        } else {
            proposal.against_votes += voter_balance;
        }
        proposals::write(proposal_id, proposal);

        // Distribute rewards for voting
        IRewardDistributorDispatcher {
            contract_address: reward_distributor::read()
        }.distribute_reward(caller, 10_000); // 10 tokens

        VoteCast(caller, proposal_id, support, voter_balance);
    }

    #[external]
    fn execute_proposal(proposal_id: u256) {
        let proposal = proposals::read(proposal_id);
        assert(!proposal.executed && !proposal.canceled, 'INVALID_PROPOSAL_STATE');
        assert(starknet::get_block_timestamp() > proposal.end_time, 'VOTING_NOT_ENDED');

        let total_votes = proposal.for_votes + proposal.against_votes;
        assert(total_votes >= quorum::read(), 'QUORUM_NOT_REACHED');
        assert(proposal.for_votes > proposal.against_votes, 'PROPOSAL_DEFEATED');

        let mut proposal = proposal;
        proposal.executed = true;
        proposals::write(proposal_id, proposal);

        ProposalExecuted(proposal_id);
    }

    #[external]
    fn cancel_proposal(proposal_id: u256) {
        let caller = get_caller_address();
        let mut proposal = proposals::read(proposal_id);
        
        assert(caller == proposal.proposer, 'UNAUTHORIZED');
        assert(!proposal.executed && !proposal.canceled, 'INVALID_PROPOSAL_STATE');
        assert(starknet::get_block_timestamp() <= proposal.end_time, 'VOTING_ENDED');

        proposal.canceled = true;
        proposals::write(proposal_id, proposal);

        ProposalCanceled(proposal_id);
    }

    #[view]
    fn get_proposal(proposal_id: u256) -> Proposal {
        proposals::read(proposal_id)
    }

    #[view]
    fn get_vote(proposal_id: u256, voter: ContractAddress) -> Vote {
        votes::read((proposal_id, voter))
    }

    #[view]
    fn get_quorum() -> u256 {
        quorum::read()
    }

    #[view]
    fn get_voting_period() -> u64 {
        voting_period::read()
    }
}
