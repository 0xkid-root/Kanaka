import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../services/logging.service';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Middleware to sanitize request inputs to prevent XSS and injection attacks
 */
@Injectable()
export class RequestSanitizerMiddleware implements NestMiddleware {
  private readonly logger: AppLoggerService;

  constructor(loggerService: AppLoggerService) {
    this.logger = loggerService.createLogger(RequestSanitizerMiddleware.name);
  }

  /**
   * Sanitize request body, query, and params
   */
  use(req: Request, _res: Response, next: NextFunction) {
    // Sanitize request body
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    next();
  }

  /**
   * Recursively sanitize an object
   * @param obj Object to sanitize
   * @returns Sanitized object
   */
  private sanitizeObject(obj: any): any {
    if (!obj) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        // Skip sanitizing certain fields like passwords, hashes, etc.
        if (this.shouldSkipSanitization(key)) {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    // Handle strings
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    // Return other types as is
    return obj;
  }

  /**
   * Sanitize a string to prevent XSS
   * @param str String to sanitize
   * @returns Sanitized string
   */
  private sanitizeString(str: string): string {
    // Skip sanitizing if the string is a blockchain address, hash, or signature
    if (this.isBlockchainData(str)) {
      return str;
    }

    // Skip sanitizing if the string is a JWT token
    if (this.isJwtToken(str)) {
      return str;
    }

    // Sanitize HTML content
    return sanitizeHtml(str, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape',
    });
  }

  /**
   * Check if a string is blockchain-related data that should not be sanitized
   * @param str String to check
   * @returns True if the string is blockchain data
   */
  private isBlockchainData(str: string): boolean {
    // Check if the string is an Ethereum address
    if (/^0x[a-fA-F0-9]{40}$/.test(str)) {
      return true;
    }

    // Check if the string is a transaction hash
    if (/^0x[a-fA-F0-9]{64}$/.test(str)) {
      return true;
    }

    // Check if the string is a signature
    if (/^0x[a-fA-F0-9]{130}$/.test(str)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a string is a JWT token
   * @param str String to check
   * @returns True if the string is a JWT token
   */
  private isJwtToken(str: string): boolean {
    return /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(str);
  }

  /**
   * Check if a field should be skipped for sanitization
   * @param key Field name
   * @returns True if the field should be skipped
   */
  private shouldSkipSanitization(key: string): boolean {
    const sensitiveFields = [
      'password',
      'passwordConfirmation',
      'currentPassword',
      'newPassword',
      'privateKey',
      'mnemonic',
      'secret',
      'token',
      'signature',
      'hash',
      'address',
      'nonce',
    ];

    return sensitiveFields.includes(key.toLowerCase());
  }
}