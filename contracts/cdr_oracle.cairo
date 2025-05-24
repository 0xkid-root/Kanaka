#[contract]
mod CDROracle {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use zeroable::Zeroable;
    use traits::Into;
    use traits::TryInto;
    use option::OptionTrait;

    struct Storage {
        pool_metrics: LegacyMap::<felt252, PoolMetrics>,
        correlations: LegacyMap::<(felt252, felt252), u256>,
        yield_engine: ContractAddress,
        governance: ContractAddress,
    }

    struct PoolMetrics {
        tvl: u256,
        volatility: u256,
        yield_rate: u256,
        last_update: u64,
    }

    #[event]
    fn MetricsUpdated(pool_id: felt252, tvl: u256, volatility: u256, yield_rate: u256) {}

    #[event]
    fn CorrelationUpdated(pool_a: felt252, pool_b: felt252, correlation: u256) {}

    #[constructor]
    fn constructor(
        yield_engine_address: ContractAddress,
        governance_address: ContractAddress
    ) {
        yield_engine::write(yield_engine_address);
        governance::write(governance_address);
    }

    #[external]
    fn update_pool_metrics(pool_id: felt252, amount: u256, is_deposit: bool) {
        let caller = get_caller_address();
        assert(caller == yield_engine::read(), 'UNAUTHORIZED');

        let mut metrics = pool_metrics::read(pool_id);
        
        if is_deposit {
            metrics.tvl += amount;
        } else {
            metrics.tvl -= amount;
        }

        metrics.last_update = starknet::get_block_timestamp();
        pool_metrics::write(pool_id, metrics);

        MetricsUpdated(pool_id, metrics.tvl, metrics.volatility, metrics.yield_rate);
    }

    #[external]
    fn update_volatility(pool_id: felt252, new_volatility: u256) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');

        let mut metrics = pool_metrics::read(pool_id);
        metrics.volatility = new_volatility;
        metrics.last_update = starknet::get_block_timestamp();
        pool_metrics::write(pool_id, metrics);

        MetricsUpdated(pool_id, metrics.tvl, metrics.volatility, metrics.yield_rate);
    }

    #[external]
    fn update_yield_rate(pool_id: felt252, new_yield_rate: u256) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');

        let mut metrics = pool_metrics::read(pool_id);
        metrics.yield_rate = new_yield_rate;
        metrics.last_update = starknet::get_block_timestamp();
        pool_metrics::write(pool_id, metrics);

        MetricsUpdated(pool_id, metrics.tvl, metrics.volatility, metrics.yield_rate);
    }

    #[external]
    fn update_correlation(pool_a: felt252, pool_b: felt252, correlation: u256) {
        let caller = get_caller_address();
        assert(caller == governance::read(), 'UNAUTHORIZED');
        assert(correlation <= 100_000, 'INVALID_CORRELATION'); // Max 100% (100,000 basis points)

        correlations::write((pool_a, pool_b), correlation);
        correlations::write((pool_b, pool_a), correlation);

        CorrelationUpdated(pool_a, pool_b, correlation);
    }

    #[view]
    fn get_pool_metrics(pool_id: felt252) -> PoolMetrics {
        pool_metrics::read(pool_id)
    }

    #[view]
    fn get_correlation(pool_a: felt252, pool_b: felt252) -> u256 {
        correlations::read((pool_a, pool_b))
    }

    #[view]
    fn get_pool_yield(pool_id: felt252) -> (u256, u64) {
        let metrics = pool_metrics::read(pool_id);
        (metrics.yield_rate * metrics.tvl / 100_000, metrics.last_update)
    }
}
