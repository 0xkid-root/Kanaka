import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '../decorators/skip-throttle.decorator';
import { SkipTransform } from '../decorators/skip-transform.decorator';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Version')
@Controller('version')
export class VersionController {
  private readonly version: string;
  private readonly buildDate: string;
  private readonly commitHash: string;

  constructor() {
    // Try to read package.json for version info
    try {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      this.version = packageJson.version || '1.0.0';
    } catch (error) {
      this.version = '1.0.0';
    }

    // Set build date to current date
    this.buildDate = new Date().toISOString();
    
    // Set commit hash to a placeholder
    this.commitHash = 'development';
  }

  @Get()
  @SkipThrottle()
  @SkipTransform()
  @ApiOperation({ summary: 'Get API version information' })
  @ApiResponse({
    status: 200,
    description: 'Returns version information',
    schema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          example: '1.0.0',
        },
        buildDate: {
          type: 'string',
          example: '2023-05-23T10:15:30Z',
        },
        commitHash: {
          type: 'string',
          example: 'abc123def456',
        },
      },
    },
  })
  getVersion() {
    return {
      version: this.version,
      buildDate: this.buildDate,
      commitHash: this.commitHash,
    };
  }
}