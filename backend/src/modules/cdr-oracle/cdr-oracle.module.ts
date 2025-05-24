import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CDROracleService } from './cdr-oracle.service';
import { CDROracleController } from './cdr-oracle.controller';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { ErrorHandlerService } from '../../common/services/error-handler.service';
import { PoolMetrics } from './entities/pool-metrics.entity';
import { PoolCorrelation } from './entities/pool-correlation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PoolMetrics, PoolCorrelation]),
  ],
  controllers: [CDROracleController],
  providers: [
    CDROracleService, 
    ContractService,
    TransactionService,
    AppLoggerService,
    ErrorHandlerService,
  ],
  exports: [CDROracleService],
})
export class CDROracleModule {}
