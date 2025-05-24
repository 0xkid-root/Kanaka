import { Injectable } from '@nestjs/common';
import { AppLoggerService } from './logging.service';
// import { RedisService } from './redis.service'; // Import is unused

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
   * Number of successful calls to close the circuit
   */
  successThreshold?: number;
  
  /**
   * Time in milliseconds to consider a call as timed out
   */
  timeout?: number;
  
  /**
   * Types of errors to count as failures
   */
  failureTypes?: any[];
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger: AppLoggerService;
  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    timeout: 10000,
    failureTypes: [],
  };
  
  private readonly circuits: Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    options: Required<CircuitBreakerOptions>;
  }> = new Map();

  constructor(
    // private redisService: RedisService, // Parameter is unused
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
    const opts = { ...this.defaultOptions, ...options };
    
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
    
    const circuit = this.circuits.get(circuitName);
    
    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      const now = Date.now();
      const timeElapsed = now - circuit.lastFailure;
      
      if (timeElapsed < opts.resetTimeout) {
        this.logger.warn(`Circuit ${circuitName} is OPEN, rejecting request`);
        throw new Error(`Circuit ${circuitName} is open`);
      } else {
        // Transition to half-open state
        this.logger.log(`Circuit ${circuitName} is transitioning from OPEN to HALF_OPEN`);
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successes = 0;
      }
    }
    
    // Execute the function with timeout
    try {
      const result = await this.executeWithTimeout(fn, opts.timeout);
      
      // Handle success
      if (circuit.state === CircuitState.HALF_OPEN) {
        circuit.successes++;
        
        if (circuit.successes >= opts.successThreshold) {
          this.logger.log(`Circuit ${circuitName} is transitioning from HALF_OPEN to CLOSED`);
          circuit.state = CircuitState.CLOSED;
          circuit.failures = 0;
          circuit.successes = 0;
        }
      } else if (circuit.state === CircuitState.CLOSED) {
        // Reset failures on success in closed state
        circuit.failures = 0;
      }
      
      return result;
    } catch (error) {
      // Check if this error type should count as a failure
      const isFailureType = 
        opts.failureTypes.length === 0 || 
        opts.failureTypes.some(errorType => error instanceof errorType);
      
      if (isFailureType) {
        circuit.failures++;
        circuit.lastFailure = Date.now();
        
        this.logger.warn(`Circuit ${circuitName} recorded failure ${circuit.failures}/${opts.failureThreshold}: ${error.message}`);
        
        // Check if we should open the circuit
        if (circuit.failures >= opts.failureThreshold) {
          this.logger.error(`Circuit ${circuitName} is transitioning to OPEN state after ${circuit.failures} failures`);
          circuit.state = CircuitState.OPEN;
        }
      }
      
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
      
      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
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

  /**
   * Reset a circuit to closed state
   * @param circuitName Name of the circuit
   */
  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    
    if (circuit) {
      this.logger.log(`Manually resetting circuit ${circuitName} to CLOSED state`);
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
    }
  }

  /**
   * Get all circuit states
   * @returns Map of circuit names to states
   */
  getAllCircuitStates(): Map<string, CircuitState> {
    const states = new Map<string, CircuitState>();
    
    for (const [name, circuit] of this.circuits.entries()) {
      states.set(name, circuit.state);
    }
    
    return states;
  }
}