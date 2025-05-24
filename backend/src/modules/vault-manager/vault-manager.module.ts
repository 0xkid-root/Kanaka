import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultManagerService } from './vault-manager.service';
import { VaultManagerController } from './vault-manager.controller';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { ErrorHandlerService } from '../../common/services/error-handler.service';
import { PoolBalance, Pool } from './entities/vault.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PoolBalance, Pool]),
  ],
  controllers: [VaultManagerController],
  providers: [
    VaultManagerService, 
    ContractService,
    TransactionService,
    AppLoggerService,
    ErrorHandlerService,
  ],
  exports: [VaultManagerService],
})
export class VaultManagerModule {}
