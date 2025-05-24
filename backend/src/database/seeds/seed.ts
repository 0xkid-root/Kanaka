import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { Pool } from '../../modules/vault-manager/entities/vault.entity';
import { PoolMetrics } from '../../modules/cdr-oracle/entities/pool-metrics.entity';
import { PoolCorrelation } from '../../modules/cdr-oracle/entities/pool-correlation.entity';
import { AuthorizedDistributor } from '../../modules/reward-distributor/entities/reward.entity';

// Load environment variables
config();
const configService = new ConfigService();

// Database configuration
// const isProduction = configService.get('NODE_ENV') === 'production'; // Variable is unused
const dataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST') || 'localhost',
  port: parseInt(configService.get('DATABASE_PORT') || '5432', 10),
  username: configService.get('DATABASE_USERNAME') || 'postgres',
  password: configService.get('DATABASE_PASSWORD') || 'postgres',
  database: configService.get('DATABASE_NAME') || 'kanaka',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function seed() {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Database connection initialized');

    // Seed initial pools
    const poolRepository = dataSource.getRepository(Pool);
    const initialPools = [
      {
        poolId: '0x01',
        token: '0xETH',
        totalSupply: '0',
        active: true,
        apy: 5.2,
      },
      {
        poolId: '0x02',
        token: '0xUSDC',
        totalSupply: '0',
        active: true,
        apy: 3.8,
      },
      {
        poolId: '0x03',
        token: '0xDAI',
        totalSupply: '0',
        active: true,
        apy: 4.1,
      },
    ];

    for (const pool of initialPools) {
      const existingPool = await poolRepository.findOne({ where: { poolId: pool.poolId } });
      if (!existingPool) {
        await poolRepository.save(pool);
        console.log(`Seeded pool: ${pool.poolId} (${pool.token})`);
      }
    }

    // Seed initial pool metrics
    const metricsRepository = dataSource.getRepository(PoolMetrics);
    const now = Math.floor(Date.now() / 1000);
    const initialMetrics = [
      {
        poolId: '0x01',
        tvl: '1000000000000000000000',
        volatility: '200000000000000000',
        yieldRate: '50000000000000000',
        lastUpdate: now,
      },
      {
        poolId: '0x02',
        tvl: '5000000000000000000000',
        volatility: '100000000000000000',
        yieldRate: '38000000000000000',
        lastUpdate: now,
      },
      {
        poolId: '0x03',
        tvl: '3000000000000000000000',
        volatility: '150000000000000000',
        yieldRate: '41000000000000000',
        lastUpdate: now,
      },
    ];

    for (const metric of initialMetrics) {
      const existingMetric = await metricsRepository.findOne({ where: { poolId: metric.poolId } });
      if (!existingMetric) {
        await metricsRepository.save(metric);
        console.log(`Seeded metrics for pool: ${metric.poolId}`);
      }
    }

    // Seed initial pool correlations
    const correlationRepository = dataSource.getRepository(PoolCorrelation);
    const initialCorrelations = [
      {
        poolA: '0x01',
        poolB: '0x02',
        correlation: '500000000000000000', // 0.5
      },
      {
        poolA: '0x01',
        poolB: '0x03',
        correlation: '700000000000000000', // 0.7
      },
      {
        poolA: '0x02',
        poolB: '0x03',
        correlation: '800000000000000000', // 0.8
      },
    ];

    for (const correlation of initialCorrelations) {
      const existingCorrelation = await correlationRepository.findOne({
        where: { poolA: correlation.poolA, poolB: correlation.poolB },
      });
      if (!existingCorrelation) {
        await correlationRepository.save(correlation);
        console.log(`Seeded correlation between pools: ${correlation.poolA} and ${correlation.poolB}`);
      }
    }

    // Seed initial authorized distributors
    const distributorRepository = dataSource.getRepository(AuthorizedDistributor);
    const initialDistributors = [
      {
        address: '0x1234567890123456789012345678901234567890',
        authorized: true,
      },
    ];

    for (const distributor of initialDistributors) {
      const existingDistributor = await distributorRepository.findOne({
        where: { address: distributor.address },
      });
      if (!existingDistributor) {
        await distributorRepository.save(distributor);
        console.log(`Seeded authorized distributor: ${distributor.address}`);
      }
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    // Close the database connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the seed function
seed();