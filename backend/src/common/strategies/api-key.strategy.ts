import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AppConfigService } from '../services/config.service';
import { AppLoggerService } from '../services/logging.service';
import { RedisService } from '../services/redis.service';

/**
 * API key authentication strategy
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
  private readonly logger: AppLoggerService;
  private readonly apiKeys: Map<string, { name: string, roles: string[] }> = new Map();

  constructor(
    private configService: AppConfigService,
    private redisService: RedisService,
    loggerService: AppLoggerService,
  ) {
    super(
      { header: 'X-API-KEY', prefix: '' },
      true,
      async (apiKey, done) => {
        return this.validate(apiKey, done);
      }
    );
    
    this.logger = loggerService.createLogger(ApiKeyStrategy.name);
    this.loadApiKeys();
  }

  /**
   * Load API keys from configuration
   */
  private loadApiKeys() {
    try {
      // Load API keys from environment variables
      const apiKeysStr = this.configService.get('API_KEYS', '');
      
      if (!apiKeysStr) {
        this.logger.warn('No API keys configured');
        return;
      }
      
      // Format: key1:name1:role1,role2;key2:name2:role1,role3
      const apiKeyEntries = apiKeysStr.split(';');
      
      for (const entry of apiKeyEntries) {
        const [key, name, rolesStr] = entry.split(':');
        
        if (!key || !name) {
          continue;
        }
        
        const roles = rolesStr ? rolesStr.split(',').map(r => r.trim()) : [];
        this.apiKeys.set(key, { name, roles });
      }
      
      this.logger.log(`Loaded ${this.apiKeys.size} API keys`);
    } catch (error) {
      this.logger.error(`Failed to load API keys: ${error.message}`, error.stack);
    }
  }

  /**
   * Validate the API key
   * @param apiKey API key
   * @param done Callback function
   */
  async validate(apiKey: string, done: (err: Error | null, user?: any) => void) {
    try {
      // Check if the API key is in the static list
      if (this.apiKeys.has(apiKey)) {
        const { name, roles } = this.apiKeys.get(apiKey);
        this.logger.debug(`API key validated: ${name}`);
        
        return done(null, { 
          apiKey: true, 
          name, 
          roles,
        });
      }
      
      // Check if the API key is in Redis (for dynamically generated keys)
      const apiKeyData = await this.redisService.getJson(`apikey:${apiKey}`);
      
      if (apiKeyData) {
        this.logger.debug(`Dynamic API key validated: ${apiKeyData.name}`);
        
        return done(null, { 
          apiKey: true, 
          name: apiKeyData.name, 
          roles: apiKeyData.roles || [],
          metadata: apiKeyData.metadata || {},
        });
      }
      
      // API key not found
      this.logger.warn(`Invalid API key attempt`);
      return done(new UnauthorizedException('Invalid API key'));
    } catch (error) {
      this.logger.error(`API key validation error: ${error.message}`, error.stack);
      return done(new UnauthorizedException('API key validation failed'));
    }
  }
}