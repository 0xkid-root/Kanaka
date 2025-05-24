import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigService } from './services/config.service';
import { ContractService } from './services/contract.service';
import { SignatureService } from './services/signature.service';
import { RedisService } from './services/redis.service';
import { EventListenerService } from './services/event-listener.service';
import { TransactionService } from './services/transaction.service';
import { TransactionMonitorService } from './services/transaction-monitor.service';
import { GasOptimizerService } from './services/gas-optimizer.service';
import { AppLoggerService } from './services/logging.service';
import { HealthService } from './services/health.service';
import { LockService } from './services/lock.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ErrorHandlerService } from './services/error-handler.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { SensitiveDataFilter } from './filters/sensitive-data.filter';
import { HealthController } from './controllers/health.controller';
import { VersionController } from './controllers/version.controller';
import { User } from '../modules/user/entities/user.entity';
import { Transaction } from './entities/transaction.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([User, Transaction]),
  ],
  controllers: [HealthController, VersionController],
  providers: [
    AppConfigService,
    ContractService,
    SignatureService,
    RedisService,
    EventListenerService,
    TransactionService,
    AppLoggerService,
    HealthService,
    LockService,
    CircuitBreakerService,
    ErrorHandlerService,
    RateLimiterService,
    SensitiveDataFilter,
  ],
  exports: [
    AppConfigService,
    ContractService,
    SignatureService,
    RedisService,
    EventListenerService,
    TransactionService,
    AppLoggerService,
    HealthService,
    LockService,
    CircuitBreakerService,
    ErrorHandlerService,
    RateLimiterService,
    SensitiveDataFilter,
  ],
})
export class CommonModule {}