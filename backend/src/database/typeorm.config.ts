import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config();

const configService = new ConfigService();
const isProduction = configService.get('NODE_ENV') === 'production';

// Database configuration for migrations
export default new DataSource({
  type: isProduction ? 'postgres' : 'sqlite',
  host: isProduction ? configService.get('DATABASE_HOST') : undefined,
  port: isProduction ? parseInt(configService.get('DATABASE_PORT'), 10) : undefined,
  username: isProduction ? configService.get('DATABASE_USERNAME') : undefined,
  password: isProduction ? configService.get('DATABASE_PASSWORD') : undefined,
  database: isProduction ? configService.get('DATABASE_NAME') : configService.get('DATABASE_PATH', 'kanaka.db'),
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  ssl: isProduction && configService.get('DATABASE_SSL') === 'true' ? {
    rejectUnauthorized: false,
  } : undefined,
});