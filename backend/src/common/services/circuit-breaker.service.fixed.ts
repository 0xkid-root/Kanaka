import { Injectable } from '@nestjs/common';
import { AppLoggerService } from './logging.service';
import { RedisService } from './redis.service';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  /**
   * Number of failures before opening the circuit
   */
  failureThreshold?: number;
  
  /**
   * Time in milliseconds to keep the circuit open
   */
  resetTimeout?: number;
  
  /**
   * Number of successful calls to close the circuit when half-open
   */
  successThreshold?: number;
  
  /**
   * Timeout for the function call in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to track the circuit state in Redis
   */
  persistent?: boolean;
}

/**
 * Circuit breaker service to prevent cascading failures
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger: AppLoggerService;
  
  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    timeout: 10000,
    persistent: false,
  };
  
  private circuits: Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    options: Required<CircuitBreakerOptions>;
  }> = new Map();

  constructor(
    private readonly redisService: RedisService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(CircuitBreakerService.name);
  }

  /**
   * Execute a function with circuit breaker protection
   * @param circuitName Name of the circuit
   * @param fn Function to execute
   * @param options Circuit breaker options
   * @returns Result of the function
   */
  async execute<T>(circuitName: string, fn: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T> {
    const opts = { ...this.defaultOptions, ...options } as Required<CircuitBreakerOptions>;
    
    // Initialize circuit if it doesn't exist
    if (!this.circuits.has(circuitName)) {
      this.circuits.set(circuitName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailure: 0,
        options: opts,
      });
    }
    
    const circuit = this.circuits.get(circuitName)!;
    
    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      const now = Date.now();
      const timeElapsed = now - circuit.lastFailure;
      
      if (timeElapsed < opts.resetTimeout) {
        this.logger.warn(`Circuit ${circuitName} is OPEN, rejecting request`);
        throw new Error(`Circuit ${circuitName} is open`);
      } else {
        // Transition to half-open state
        this.logger.log(`Circuit ${circuitName} is transitioning to HALF_OPEN`);
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successes = 0;
      }
    }
    
    try {
      // Execute the function with timeout
      const result = await this.executeWithTimeout(fn, opts.timeout);
      
      // Handle success
      this.handleSuccess(circuitName, circuit);
      
      return result;
    } catch (error) {
      // Handle failure
      this.handleFailure(circuitName, circuit, error);
      throw error;
    }
  }
  
  /**
   * Execute a function with a timeout
   * @param fn Function to execute
   * @param timeout Timeout in milliseconds
   * @returns Result of the function
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, timeout);
      
      fn().then(
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Handle a successful function execution
   * @param circuitName Name of the circuit
   * @param circuit Circuit state
   */
  private handleSuccess(circuitName: string, circuit: {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    options: Required<CircuitBreakerOptions>;
  }): void {
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      
      if (circuit.successes >= circuit.options.successThreshold) {
        this.logger.log(`Circuit ${circuitName} is transitioning to CLOSED`);
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Reset failures on success in closed state
      circuit.failures = 0;
    }
    
    // Persist circuit state if enabled
    if (circuit.options.persistent) {
      this.persistCircuitState(circuitName, circuit);
    }
  }
  
  /**
   * Handle a failed function execution
   * @param circuitName Name of the circuit
   * @param circuit Circuit state
   * @param error Error that occurred
   */
  private handleFailure(circuitName: string, circuit: {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    options: Required<CircuitBreakerOptions>;
  }, error: unknown): void {
    circuit.failures++;
    circuit.lastFailure = Date.now();
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Circuit ${circuitName} failure: ${errorMessage}`);
    
    if (circuit.state === CircuitState.HALF_OPEN || 
        (circuit.state === CircuitState.CLOSED && circuit.failures >= circuit.options.failureThreshold)) {
      this.logger.warn(`Circuit ${circuitName} is transitioning to OPEN`);
      circuit.state = CircuitState.OPEN;
      circuit.successes = 0;
    }
    
    // Persist circuit state if enabled
    if (circuit.options.persistent) {
      this.persistCircuitState(circuitName, circuit);
    }
  }
  
  /**
   * Persist circuit state to Redis
   * @param circuitName Name of the circuit
   * @param circuit Circuit state
   */
  private async persistCircuitState(circuitName: string, circuit: {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    options: Required<CircuitBreakerOptions>;
  }): Promise<void> {
    try {
      const key = `circuit:${circuitName}`;
      await this.redisService.setJson(key, {
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        lastFailure: circuit.lastFailure,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to persist circuit state: ${errorMessage}`);
    }
  }
  
  /**
   * Load circuit state from Redis
   * @param circuitName Name of the circuit
   * @returns Whether the circuit state was loaded successfully
   */
  async loadCircuitState(circuitName: string): Promise<boolean> {
    try {
      const key = `circuit:${circuitName}`;
      const state = await this.redisService.getJson<{
        state: CircuitState;
        failures: number;
        successes: number;
        lastFailure: number;
      }>(key);
      
      if (state) {
        const circuit = this.circuits.get(circuitName);
        if (circuit) {
          circuit.state = state.state;
          circuit.failures = state.failures;
          circuit.successes = state.successes;
          circuit.lastFailure = state.lastFailure;
          return true;
        }
      }
      
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load circuit state: ${errorMessage}`);
      return false;
    }
  }
  
  /**
   * Reset a circuit to closed state
   * @param circuitName Name of the circuit
   */
  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
      
      if (circuit.options.persistent) {
        this.persistCircuitState(circuitName, circuit);
      }
      
      this.logger.log(`Circuit ${circuitName} has been reset to CLOSED`);
    }
  }
  
  /**
   * Get the current state of a circuit
   * @param circuitName Name of the circuit
   * @returns Circuit state or null if the circuit doesn't exist
   */
  getCircuitState(circuitName: string): CircuitState | null {
    const circuit = this.circuits.get(circuitName);
    return circuit ? circuit.state : null;
  }
}