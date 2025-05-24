#[contract]
mod StrategyRegistry {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use zeroable::Zeroable;
    use traits::Into;
    use traits::TryInto;
    use option::OptionTrait;

    struct Storage {
        pools: LegacyMap::<felt252, Pool>,
        pool_count: felt252,
        vault_manager: ContractAddress,
        yield_engine: ContractAddress,
        governance: ContractAddress,
    }

    struct Pool {
        token: ContractAddress,
        strategy: ContractAddress,
        active: bool,
        min_deposit: u256,
        max_capacity: u256,
    }

    #[event]
    fn PoolAdded(pool_id: felt252, token: ContractAddress, strategy: ContractAddress) {}

    #[event]
    fn PoolUpdated(pool_id: felt252, active: bool, min_deposit: u256, max_capacity: u256) {}

    #[event]
    fn StrategyExecuted(pool_id: felt252, strategy: ContractAddress) {}

    #[constructor]
    fn constructor(
        vault_manager_address: ContractAddress,
        yield_engine_address: ContractAddress,
        governance_address: ContractAddress
    ) {
        vault_manager::write(vault_manager_address);
        yield_engine::write(yield_engine_address);
        governance::write(governance_address);
        pool_count::write(0);
    }

    #[external]
    fn add_pool(
        token: ContractAddress,
        strategy: ContractAddress,
        min_deposit: u256,
        max_capacity: u256
    ) -> felt252 {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');
        assert(!token.is_zero() && !strategy.is_zero(), 'INVALID_ADDRESSES');

        let pool_id = pool_count::read();
        let new_pool = Pool {
            token,
            strategy,
            active: true,
            min_deposit,
            max_capacity
        };
        pools::write(pool_id, new_pool);
        pool_count::write(pool_id + 1);

        // Register pool with vault manager
        IVaultManagerDispatcher {
            contract_address: vault_manager::read()
        }.add_pool(pool_id, token);

        PoolAdded(pool_id, token, strategy);
        pool_id
    }

    #[external]
    fn update_pool(
        pool_id: felt252,
        active: bool,
        min_deposit: u256,
        max_capacity: u256
    ) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');

        let mut pool = pools::read(pool_id);
        assert(!pool.token.is_zero(), 'INVALID_POOL');

        pool.active = active;
        pool.min_deposit = min_deposit;
        pool.max_capacity = max_capacity;
        pools::write(pool_id, pool);

        PoolUpdated(pool_id, active, min_deposit, max_capacity);
    }

    #[external]
    fn execute_rebalance(new_weights: Array<u256>) {
        let caller = get_caller_address();
        assert(caller == yield_engine::read(), 'UNAUTHORIZED');

        let mut i: usize = 0;
        loop {
            if i >= new_weights.len() {
                break;
            }
            
            let pool_id: felt252 = i.into();
            let pool = pools::read(pool_id);
            
            if pool.active {
                // Execute strategy
                IStrategyDispatcher {
                    contract_address: pool.strategy
                }.execute(new_weights[i]);

                StrategyExecuted(pool_id, pool.strategy);
            }
            
            i += 1;
        }
    }

    #[view]
    fn get_pool(pool_id: felt252) -> Pool {
        pools::read(pool_id)
    }

    #[view]
    fn get_pool_count() -> felt252 {
        pool_count::read()
    }

    #[view]
    fn is_valid_deposit(pool_id: felt252, amount: u256) -> bool {
        let pool = pools::read(pool_id);
        pool.active && amount >= pool.min_deposit && amount <= pool.max_capacity
    }
}
