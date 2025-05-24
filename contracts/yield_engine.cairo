#[contract]
mod YieldEngine {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use zeroable::Zeroable;
    use traits::Into;
    use traits::TryInto;
    use option::OptionTrait;

    struct Storage {
        pool_weights: LegacyMap::<felt252, u256>,
        total_weights: u256,
        vault_manager: ContractAddress,
        cdr_oracle: ContractAddress,
        strategy_registry: ContractAddress,
        governance: ContractAddress,
    }

    #[event]
    fn Rebalanced(new_weights: Array<u256>) {}

    #[event]
    fn YieldHarvested(pool_id: felt252, amount: u256) {}

    #[constructor]
    fn constructor(
        vault_manager_address: ContractAddress,
        cdr_oracle_address: ContractAddress,
        strategy_registry_address: ContractAddress,
        governance_address: ContractAddress
    ) {
        vault_manager::write(vault_manager_address);
        cdr_oracle::write(cdr_oracle_address);
        strategy_registry::write(strategy_registry_address);
        governance::write(governance_address);
    }

    #[external]
    fn rebalance(new_weights: Array<u256>) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');

        let mut total: u256 = 0;
        let mut i: usize = 0;
        
        // Validate and update weights
        loop {
            if i >= new_weights.len() {
                break;
            }
            let weight = *new_weights[i];
            let pool_id: felt252 = i.into();
            
            pool_weights::write(pool_id, weight);
            total += weight;
            
            i += 1;
        };

        assert(total == 100_000, 'INVALID_WEIGHTS'); // Weights must sum to 100% (100,000 basis points)
        total_weights::write(total);

        // Execute rebalancing through strategy registry
        IStrategyRegistryDispatcher {
            contract_address: strategy_registry::read()
        }.execute_rebalance(new_weights);

        Rebalanced(new_weights);
    }

    #[external]
    fn harvest_yield(pool_id: felt252) {
        let caller = get_caller_address();
        assert(caller == strategy_registry::read(), 'UNAUTHORIZED');

        // Get yield data from CDR Oracle
        let (yield_amount, _) = ICDROracleDispatcher {
            contract_address: cdr_oracle::read()
        }.get_pool_yield(pool_id);

        // Update pool metrics
        if yield_amount > 0 {
            // Distribute yield through vault manager
            IVaultManagerDispatcher {
                contract_address: vault_manager::read()
            }.distribute_yield(pool_id, yield_amount);

            YieldHarvested(pool_id, yield_amount);
        }
    }

    #[view]
    fn get_pool_weight(pool_id: felt252) -> u256 {
        pool_weights::read(pool_id)
    }

    #[view]
    fn get_total_weights() -> u256 {
        total_weights::read()
    }

    #[external]
    fn on_deposit(pool_id: felt252, amount: u256) {
        let caller = get_caller_address();
        assert(caller == vault_manager::read(), 'UNAUTHORIZED');

        // Update CDR Oracle
        ICDROracleDispatcher {
            contract_address: cdr_oracle::read()
        }.update_pool_metrics(pool_id, amount, true);
    }

    #[external]
    fn on_withdrawal(pool_id: felt252, amount: u256) {
        let caller = get_caller_address();
        assert(caller == vault_manager::read(), 'UNAUTHORIZED');

        // Update CDR Oracle
        ICDROracleDispatcher {
            contract_address: cdr_oracle::read()
        }.update_pool_metrics(pool_id, amount, false);
    }
}
