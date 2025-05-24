import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Default configuration for SQLite (development)
  const sqliteConfig: TypeOrmModuleOptions = {
    type: 'sqlite',
    database: process.env.DATABASE_PATH || 'kanaka.db',
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
    migrationsRun: true,
    synchronize: false, // Always false for safety, use migrations instead
    logging: process.env.DATABASE_LOGGING === 'true',
  };
  
  // PostgreSQL configuration (production)
  const postgresConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
    migrationsRun: true,
    synchronize: false, // Always false for safety, use migrations instead
    ssl: process.env.DATABASE_SSL === 'true' ? {
      rejectUnauthorized: false, // Needed for some cloud providers
    } : false,
    logging: process.env.DATABASE_LOGGING === 'true',
    // Connection pool settings
    extra: {
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) || 10,
      connectionTimeoutMillis: 10000, // 10 seconds
    },
  };
  
  // Use PostgreSQL in production, SQLite in development
  return isProduction ? postgresConfig : sqliteConfig;
});