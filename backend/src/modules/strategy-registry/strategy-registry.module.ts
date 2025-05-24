import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategyRegistryService } from './strategy-registry.service';
import { StrategyRegistryController } from './strategy-registry.controller';
import { ContractService } from '../../common/services/contract.service';
import { Pool, StrategyExecution } from './entities/strategy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pool, StrategyExecution]),
  ],
  controllers: [StrategyRegistryController],
  providers: [StrategyRegistryService, ContractService],
  exports: [StrategyRegistryService],
})
export class StrategyRegistryModule {}
