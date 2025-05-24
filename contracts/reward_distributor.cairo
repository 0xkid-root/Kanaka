#[contract]
mod RewardDistributor {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use zeroable::Zeroable;
    use traits::Into;
    use traits::TryInto;
    use option::OptionTrait;

    struct Storage {
        rewards: LegacyMap::<ContractAddress, u256>,
        total_distributed: u256,
        token: ContractAddress,
        governance: ContractAddress,
        authorized_distributors: LegacyMap::<ContractAddress, bool>,
    }

    #[event]
    fn RewardDistributed(user: ContractAddress, amount: u256, reason: felt252) {}

    #[event]
    fn RewardClaimed(user: ContractAddress, amount: u256) {}

    #[constructor]
    fn constructor(
        token_address: ContractAddress,
        governance_address: ContractAddress
    ) {
        token::write(token_address);
        governance::write(governance_address);
        authorized_distributors::write(governance_address, true);
    }

    #[external]
    fn authorize_distributor(distributor: ContractAddress) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');
        authorized_distributors::write(distributor, true);
    }

    #[external]
    fn revoke_distributor(distributor: ContractAddress) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');
        authorized_distributors::write(distributor, false);
    }

    #[external]
    fn distribute_reward(user: ContractAddress, amount: u256) {
        let caller = get_caller_address();
        assert(authorized_distributors::read(caller), 'UNAUTHORIZED');

        let current_reward = rewards::read(user);
        rewards::write(user, current_reward + amount);

        let total = total_distributed::read();
        total_distributed::write(total + amount);

        RewardDistributed(user, amount, 0);
    }

    #[external]
    fn claim_rewards() {
        let caller = get_caller_address();
        let amount = rewards::read(caller);
        assert(amount > 0, 'NO_REWARDS');

        rewards::write(caller, 0);

        IERC20Dispatcher {
            contract_address: token::read()
        }.transfer(caller, amount);

        RewardClaimed(caller, amount);
    }

    #[view]
    fn get_rewards(user: ContractAddress) -> u256 {
        rewards::read(user)
    }

    #[view]
    fn get_total_distributed() -> u256 {
        total_distributed::read()
    }

    #[view]
    fn is_authorized_distributor(distributor: ContractAddress) -> bool {
        authorized_distributors::read(distributor)
    }
}
