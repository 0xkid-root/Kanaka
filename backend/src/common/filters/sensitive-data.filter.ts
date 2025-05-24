import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../services/config.service';

/**
 * Service to filter sensitive data from logs and error messages
 */
@Injectable()
export class SensitiveDataFilter {
  // Patterns to match sensitive data
  private readonly patterns: { [key: string]: RegExp } = {
    // Authentication and personal data
    jwt: /eyJ[a-zA-Z0-9_-]{5,}\.eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}/g,
    apiKey: /api[_-]?key[=:]\s*["']?([a-zA-Z0-9]{8,})["']?/gi,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    password: /password[=:]\s*["']?([^"'&\s]{3,})["']?/gi,
    privateKey: /private[_-]?key[=:]\s*["']?([a-fA-F0-9]{32,})["']?/gi,
    mnemonic: /mnemonic[=:]\s*["']?([a-z\s]{12,})["']?/gi,
    
    // Financial data
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    
    // Blockchain specific
    signature: /0x[a-fA-F0-9]{130}/g,
    
    // Infrastructure
    ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    url: /(https?:\/\/[^\s"'<>]+)/g,
  };

  // Replacement templates
  private readonly replacements: { [key: string]: string } = {
    jwt: '[REDACTED_JWT]',
    apiKey: 'api_key: [REDACTED_API_KEY]',
    email: '[REDACTED_EMAIL]',
    password: 'password: [REDACTED]',
    privateKey: 'private_key: [REDACTED]',
    mnemonic: 'mnemonic: [REDACTED]',
    creditCard: '[REDACTED_CARD]',
    signature: '[REDACTED_SIGNATURE]',
    ipAddress: '[REDACTED_IP]',
    url: '[REDACTED_URL]',
  };

  // List of fields to completely remove from objects
  private readonly sensitiveFields: string[] = [
    'password',
    'passwordConfirmation',
    'currentPassword',
    'newPassword',
    'privateKey',
    'mnemonic',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'jwt',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'ssn',
    'creditCard',
    'cvv',
  ];

  constructor(private configService: AppConfigService) {
    // Add any additional patterns from configuration
    const additionalPatterns = this.configService.get('SENSITIVE_DATA_PATTERNS', '');
    if (additionalPatterns) {
      try {
        const patterns = JSON.parse(additionalPatterns);
        for (const [key, pattern] of Object.entries(patterns)) {
          this.patterns[key] = new RegExp(pattern as string, 'g');
          this.replacements[key] = `[REDACTED_${key.toUpperCase()}]`;
        }
      } catch (error) {
        console.error('Failed to parse additional sensitive data patterns:', error);
      }
    }
  }

  /**
   * Filter sensitive data from a string
   * @param input String to filter
   * @returns Filtered string
   */
  filterString(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let result = input;
    
    // Apply all regex patterns
    for (const [key, pattern] of Object.entries(this.patterns)) {
      const replacement = this.replacements[key] || '***';
      result = result.replace(pattern, replacement);
    }
    
    return result;
  }

  /**
   * Filter sensitive data from an object
   * @param obj Object to filter
   * @returns Filtered object
   */
  filterObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.filterObject(item));
    }

    // Handle objects
    const result = { ...obj };
    
    for (const key of Object.keys(result)) {
      // Remove sensitive fields
      if (this.sensitiveFields.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
        continue;
      }
      
      // Recursively filter nested objects
      if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.filterObject(result[key]);
        continue;
      }
      
      // Filter strings
      if (typeof result[key] === 'string') {
        result[key] = this.filterString(result[key]);
      }
    }
    
    return result;
  }

  /**
   * Filter sensitive data from error objects
   * @param error Error object
   * @returns Filtered error
   */
  filterError(error: Error): Error {
    if (!error) {
      return error;
    }

    // Create a new error to avoid modifying the original
    const filteredError = new Error(this.filterString(error.message));
    
    // Copy and filter stack trace
    if (error.stack) {
      filteredError.stack = this.filterString(error.stack);
    }
    
    // Copy and filter other properties
    for (const key of Object.getOwnPropertyNames(error)) {
      if (key !== 'message' && key !== 'stack') {
        const value = (error as any)[key];
        
        if (typeof value === 'string') {
          (filteredError as any)[key] = this.filterString(value);
        } else if (typeof value === 'object' && value !== null) {
          (filteredError as any)[key] = this.filterObject(value);
        } else {
          (filteredError as any)[key] = value;
        }
      }
    }
    
    return filteredError;
  }
}