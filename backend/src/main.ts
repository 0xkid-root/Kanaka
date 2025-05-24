import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpCacheInterceptor } from './common/interceptors/cache.interceptor';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { AppLoggerService } from './common/services/logging.service';
import { AppConfigService } from './common/services/config.service';
import { SensitiveDataFilter } from './common/filters/sensitive-data.filter';
import { ErrorHandlerService } from './common/services/error-handler.service';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  // Create the application
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  
  // Get the config and logger services
  const configService = app.get(AppConfigService);
  const logger = app.get(AppLoggerService).createLogger('Bootstrap');
  const sensitiveDataFilter = app.get(SensitiveDataFilter);
  const errorHandler = app.get(ErrorHandlerService);
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable security features
  app.use(helmet());
  app.use(compression());
  
  // Enable validation pipes globally
  app.useGlobalPipes(new CustomValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }, sensitiveDataFilter, logger));
  
  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter(logger, errorHandler, sensitiveDataFilter));
  
  // Apply global interceptors
  const reflector = app.get(Reflector);
  const cacheManager = app.get('CACHE_MANAGER');
  app.useGlobalInterceptors(
    new HttpCacheInterceptor(cacheManager, reflector),
    new LoggingInterceptor(logger, sensitiveDataFilter),
    new TransformInterceptor(reflector),
  );
  
  // Configure CORS
  const corsOrigins = configService.get('CORS_ORIGINS', '*').split(',');
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 3600,
  });
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Kanaka Protocol API')
    .setDescription('API documentation for the Kanaka Protocol - A decentralized, non-custodial, real-yield optimizer on Starknet')
    .setVersion('1.0')
    .addTag('health', 'API health check')
    .addTag('version', 'API version information')
    .addTag('user', 'User authentication and profile management')
    .addTag('defi', 'DeFi operations like deposits and withdrawals')
    .addTag('analytics', 'Yield curve modeling and analytics')
    .addTag('rebalancer', 'Portfolio rebalancing operations')
    .addTag('governance', 'DAO governance proposals and voting')
    .addTag('social', 'Social media integration and forum management')
    .addTag('visualizer', 'Data visualization and metrics')
    .addTag('yield-engine', 'Pool weights and yield harvesting operations')
    .addTag('cdr-oracle', 'CDR metrics and correlations management')
    .addTag('reward-distributor', 'Reward distribution and claiming operations')
    .addTag('vault-manager', 'Vault deposit, withdrawal and balance operations')
    .addTag('strategy-registry', 'Strategy management and execution')
    .addBearerAuth()
    .addSecurity('admin', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Admin access token required for this endpoint'
    })
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = configService.port;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`Environment: ${configService.nodeEnv}`);
}

bootstrap();
