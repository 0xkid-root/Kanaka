import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractService } from '../../common/services/contract.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
  ],
  providers: [ContractService],
  exports: [],
})
export class RebalancerModule {}
