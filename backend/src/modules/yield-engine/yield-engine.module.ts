import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YieldEngineService } from './yield-engine.service';
import { YieldEngineController } from './yield-engine.controller';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { ErrorHandlerService } from '../../common/services/error-handler.service';
import { YieldHarvest } from './entities/yield-harvest.entity';
import { PoolWeight } from './entities/pool-weight.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([YieldHarvest, PoolWeight]),
  ],
  controllers: [YieldEngineController],
  providers: [
    YieldEngineService, 
    ContractService,
    TransactionService,
    AppLoggerService,
    ErrorHandlerService,
  ],
  exports: [YieldEngineService],
})
export class YieldEngineModule {}
