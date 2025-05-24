import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from '../../common/services/contract.service';
import { TransactionService } from '../../common/services/transaction.service';
import { AppLoggerService } from '../../common/services/logging.service';
import { ErrorHandlerService } from '../../common/services/error-handler.service';
import { GovernanceService } from './governance.service';
import { GovernanceController } from './governance.controller';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proposal, Vote]),
  ],
  controllers: [GovernanceController],
  providers: [
    GovernanceService, 
    ContractService,
    TransactionService,
    AppLoggerService,
    ErrorHandlerService,
  ],
  exports: [GovernanceService],
})
export class GovernanceModule {}
