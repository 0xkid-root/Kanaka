import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefiController } from './defi.controller';
import { DefiService } from './defi.service';
import { Pool } from './entities/pool.entity';
import { Transaction } from './entities/transaction.entity';
import { StarknetService } from '../../common/services/starknet.service';
import { MetricsGateway } from '../../common/gateways/metrics.gateway';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pool, Transaction])],
  controllers: [DefiController],
  providers: [DefiService, StarknetService, MetricsGateway, RedisService],
  exports: [DefiService],
})
export class DefiModule {}
