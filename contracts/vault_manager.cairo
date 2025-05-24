#[contract]
mod VaultManager {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use zeroable::Zeroable;
    use traits::Into;
    use traits::TryInto;
    use option::OptionTrait;

    struct Storage {
        balances: LegacyMap::<(ContractAddress, felt252), u256>,
        total_supply: LegacyMap::<felt252, u256>,
        pool_tokens: LegacyMap::<felt252, ContractAddress>,
        strategy_registry: ContractAddress,
        yield_engine: ContractAddress,
    }

    #[event]
    fn Deposit(user: ContractAddress, pool_id: felt252, amount: u256) {}

    #[event]
    fn Withdrawal(user: ContractAddress, pool_id: felt252, amount: u256) {}

    #[constructor]
    fn constructor(
        strategy_registry_address: ContractAddress,
        yield_engine_address: ContractAddress
    ) {
        strategy_registry::write(strategy_registry_address);
        yield_engine::write(yield_engine_address);
    }

    #[external]
    fn deposit(pool_id: felt252, amount: u256) {
        let caller = get_caller_address();
        assert(!caller.is_zero(), 'INVALID_CALLER');
        assert(amount > 0, 'INVALID_AMOUNT');

        // Get pool token
        let pool_token = pool_tokens::read(pool_id);
        assert(!pool_token.is_zero(), 'INVALID_POOL');

        // Transfer tokens from user
        IERC20Dispatcher { contract_address: pool_token }.transferFrom(
            caller, get_contract_address(), amount
        );

        // Update balances
        let user_balance = balances::read((caller, pool_id));
        balances::write((caller, pool_id), user_balance + amount);

        let total = total_supply::read(pool_id);
        total_supply::write(pool_id, total + amount);

        // Notify yield engine
        IYieldEngineDispatcher { 
            contract_address: yield_engine::read() 
        }.on_deposit(pool_id, amount);

        // Emit event
        Deposit(caller, pool_id, amount);
    }

    #[external]
    fn withdraw(pool_id: felt252, amount: u256) {
        let caller = get_caller_address();
        assert(!caller.is_zero(), 'INVALID_CALLER');
        
        let user_balance = balances::read((caller, pool_id));
        assert(user_balance >= amount, 'INSUFFICIENT_BALANCE');

        // Get pool token
        let pool_token = pool_tokens::read(pool_id);
        assert(!pool_token.is_zero(), 'INVALID_POOL');

        // Update balances
        balances::write((caller, pool_id), user_balance - amount);

        let total = total_supply::read(pool_id);
        total_supply::write(pool_id, total - amount);

        // Notify yield engine
        IYieldEngineDispatcher { 
            contract_address: yield_engine::read() 
        }.on_withdrawal(pool_id, amount);

        // Transfer tokens to user
        IERC20Dispatcher { contract_address: pool_token }.transfer(caller, amount);

        // Emit event
        Withdrawal(caller, pool_id, amount);
    }

    #[view]
    fn get_balance(user: ContractAddress, pool_id: felt252) -> u256 {
        balances::read((user, pool_id))
    }

    #[view]
    fn get_total_supply(pool_id: felt252) -> u256 {
        total_supply::read(pool_id)
    }

    #[external]
    fn add_pool(pool_id: felt252, token: ContractAddress) {
        // Only strategy registry can add pools
        let caller = get_caller_address();
        assert(caller == strategy_registry::read(), 'UNAUTHORIZED');
        
        assert(!token.is_zero(), 'INVALID_TOKEN');
        pool_tokens::write(pool_id, token);
    }
}
