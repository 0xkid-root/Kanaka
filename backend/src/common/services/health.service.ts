import { Injectable } from '@nestjs/common';
import { ContractService } from './contract.service';
import { AppConfigService } from './config.service';
import { AppLoggerService } from './logging.service';
// import { RedisService } from './redis.service'; // Import is unused
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';

interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  version: string;
  environment: string;
  timestamp: string;
  details: {
    database: {
      status: 'ok' | 'error';
      message?: string;
      latency?: number;
    };
    blockchain: {
      status: 'ok' | 'error' | 'degraded';
      message?: string;
      blockNumber?: number;
      networkId?: number;
      latency?: number;
      syncing?: boolean;
    };
    redis: {
      status: 'ok' | 'error';
      message?: string;
      latency?: number;
    };
    memory: {
      status: 'ok' | 'error' | 'warning';
      used: number;
      total: number;
      percentUsed: number;
      rss?: number;
    };
    cpu: {
      status: 'ok' | 'error' | 'warning';
      usage: number;
      cores: number;
      load: number[];
    };
    disk: {
      status: 'ok' | 'error' | 'warning';
      free: number;
      total: number;
      percentUsed: number;
    };
    uptime: {
      status: 'ok';
      seconds: number;
      formatted: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger: AppLoggerService;
  private startTime: number;

  constructor(
    private contractService: ContractService,
    private configService: AppConfigService,
    // private redisService: RedisService, // Parameter is unused
    loggerService: AppLoggerService,
    private connection: Connection,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.logger = loggerService.createLogger(HealthService.name);
    this.startTime = Date.now();
  }

  async checkHealth(): Promise<HealthStatus> {
    this.logger.debug('Performing health check');
    
    const [
      databaseStatus, 
      blockchainStatus, 
      redisStatus,
      memoryStatus, 
      cpuStatus,
      diskStatus,
      uptimeStatus
    ] = await Promise.all([
      this.checkDatabase(),
      this.checkBlockchain(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkCpu(),
      this.checkDisk(),
      this.checkUptime(),
    ]);

    // Determine overall status
    let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';
    
    // Critical services - if any of these are down, the system is in error state
    if (
      databaseStatus.status === 'error' || 
      blockchainStatus.status === 'error' ||
      redisStatus.status === 'error'
    ) {
      overallStatus = 'error';
    } 
    // Degraded services - if any of these are in warning state, the system is degraded
    else if (
      blockchainStatus.status === 'degraded' ||
      memoryStatus.status === 'warning' ||
      cpuStatus.status === 'warning' ||
      diskStatus.status === 'warning'
    ) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      version: this.configService.get('APP_VERSION', '1.0.0'),
      environment: this.configService.nodeEnv,
      timestamp: new Date().toISOString(),
      details: {
        database: databaseStatus,
        blockchain: blockchainStatus,
        redis: redisStatus,
        memory: memoryStatus,
        cpu: cpuStatus,
        disk: diskStatus,
        uptime: uptimeStatus,
      },
    };
  }

  private async checkDatabase(): Promise<{ 
    status: 'ok' | 'error'; 
    message?: string;
    latency?: number;
  }> {
    try {
      this.logger.debug('Checking database connection');
      
      // Check if database is connected
      if (!this.connection.isConnected) {
        throw new Error('Database connection is not established');
      }
      
      // Try to execute a simple query with timing
      const startTime = Date.now();
      await this.userRepository.count();
      const latency = Date.now() - startTime;
      
      return { 
        status: 'ok',
        latency,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database health check failed: ${errorMessage}`);
      return { 
        status: 'error', 
        message: `Database connection error: ${errorMessage}` 
      };
    }
  }

  private async checkBlockchain(): Promise<{ 
    status: 'ok' | 'error' | 'degraded'; 
    message?: string;
    blockNumber?: number;
    networkId?: number;
    latency?: number;
    syncing?: boolean;
  }> {
    try {
      this.logger.debug('Checking blockchain connection');
      
      const provider = this.contractService.getProvider();
      
      // Get current block number with timing
      const startTime = Date.now();
      const blockNumber = await provider.getBlockNumber();
      const latency = Date.now() - startTime;
      
      // Get network ID
      const network = await provider.getNetwork();
      const networkId = network.chainId;
      
      // Check if the node is syncing
      const syncStatus = await provider.send('eth_syncing', []);
      const syncing = syncStatus !== false;
      
      // Check if the expected network ID matches
      const expectedNetworkId = this.configService.get('NETWORK_ID');
      if (expectedNetworkId && Number(expectedNetworkId) !== networkId) {
        return {
          status: 'error',
          message: `Connected to wrong network. Expected: ${expectedNetworkId}, Got: ${networkId}`,
          blockNumber,
          networkId,
          latency,
          syncing,
        };
      }
      
      // Check if the latency is too high
      if (latency > 2000) {
        return {
          status: 'degraded',
          message: `High blockchain latency: ${latency}ms`,
          blockNumber,
          networkId,
          latency,
          syncing,
        };
      }
      
      // Check if the node is syncing
      if (syncing) {
        return {
          status: 'degraded',
          message: 'Blockchain node is still syncing',
          blockNumber,
          networkId,
          latency,
          syncing,
        };
      }
      
      return { 
        status: 'ok',
        blockNumber,
        networkId,
        latency,
        syncing,
      };
    } catch (error) {
      this.logger.error(`Blockchain health check failed: ${error.message}`, error.stack);
      return { 
        status: 'error', 
        message: `Blockchain connection error: ${error.message}` 
      };
    }
  }

  private async checkMemory(): Promise<{ 
    status: 'ok' | 'error'; 
    used: number;
    total: number;
    percentUsed: number;
  }> {
    try {
      this.logger.debug('Checking memory usage');
      
      const memoryUsage = process.memoryUsage();
      const used = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const total = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const percentUsed = Math.round((used / total) * 100);
      
      // Consider memory usage critical if it's above 90%
      const status = percentUsed > 90 ? 'error' : 'ok';
      
      return { 
        status,
        used,
        total,
        percentUsed,
      };
    } catch (error) {
      this.logger.error(`Memory health check failed: ${error.message}`, error.stack);
      return { 
        status: 'error', 
        used: 0,
        total: 0,
        percentUsed: 0,
      };
    }
  }

  private async checkUptime(): Promise<{ 
    status: 'ok';
    seconds: number;
    formatted: string;
  }> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Format uptime as days, hours, minutes, seconds
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    
    const formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    return {
      status: 'ok',
      seconds: uptimeSeconds,
      formatted,
    };
  }
}