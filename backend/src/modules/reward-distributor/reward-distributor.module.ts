import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardDistributorService } from './reward-distributor.service';
import { RewardDistributorController } from './reward-distributor.controller';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { ErrorHandlerService } from '../../common/services/error-handler.service';
import { Reward, AuthorizedDistributor } from './entities/reward.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reward, AuthorizedDistributor]),
  ],
  controllers: [RewardDistributorController],
  providers: [
    RewardDistributorService, 
    ContractService,
    TransactionService,
    AppLoggerService,
    ErrorHandlerService,
  ],
  exports: [RewardDistributorService],
})
export class RewardDistributorModule {}
