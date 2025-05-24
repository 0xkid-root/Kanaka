import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '../decorators/skip-throttle.decorator';
import { SkipTransform } from '../decorators/skip-transform.decorator';
import { HealthService } from '../services/health.service';
import { AppLoggerService } from '../services/logging.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger: AppLoggerService;

  constructor(
    private healthService: HealthService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(HealthController.name);
  }
  @Get()
  @SkipThrottle()
  @SkipTransform()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          example: '2023-05-23T10:15:30Z',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
        details: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
              },
            },
            blockchain: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                blockNumber: { type: 'number', example: 12345678 },
                networkId: { type: 'number', example: 1 },
              },
            },
            memory: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                used: { type: 'number', example: 100 },
                total: { type: 'number', example: 512 },
                percentUsed: { type: 'number', example: 19 },
              },
            },
            uptime: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                seconds: { type: 'number', example: 3600 },
                formatted: { type: 'string', example: '0d 1h 0m 0s' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable',
  })
  async checkHealth() {
    try {
      this.logger.debug('Health check requested');
      
      const healthStatus = await this.healthService.checkHealth();
      const response = {
        ...healthStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      };
      
      if (healthStatus.status === 'error') {
        this.logger.warn('Health check failed', response);
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }
      
      this.logger.debug('Health check successful');
      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Health check error: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          message: 'Health check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('liveness')
  @SkipThrottle()
  @SkipTransform()
  @ApiOperation({ summary: 'Simple liveness check' })
  @ApiResponse({
    status: 200,
    description: 'API is alive',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          example: '2023-05-23T10:15:30Z',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
      },
    },
  })
  checkLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}