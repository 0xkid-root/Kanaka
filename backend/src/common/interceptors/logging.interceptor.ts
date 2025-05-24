import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLoggerService } from '../services/logging.service';
import { SensitiveDataFilter } from '../filters/sensitive-data.filter';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: AppLoggerService;

  constructor(
    loggerService: AppLoggerService,
    private sensitiveDataFilter: SensitiveDataFilter,
  ) {
    this.logger = loggerService.createLogger(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();
    
    // Filter sensitive data from request body
    const filteredBody = this.sensitiveDataFilter.filterObject(request.body);
    const filteredQuery = this.sensitiveDataFilter.filterObject(request.query);
    
    // Log the request
    this.logger.debug(`Request: ${method} ${url}`, {
      ip: this.sensitiveDataFilter.filterString(ip),
      userAgent,
      body: filteredBody,
      query: filteredQuery,
      headers: this.filterHeaders(request.headers),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          const statusCode = response.statusCode;
          
          // Filter sensitive data from response
          const filteredData = this.sensitiveDataFilter.filterObject(data);

          this.logger.log(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${this.sensitiveDataFilter.filterString(ip)} - ${userAgent}`,
          );
          
          // Log detailed response for debugging
          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(`Response: ${statusCode}`, {
              responseTime,
              body: filteredData,
            });
          }
        },
        error: (error) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          const statusCode = error.status || 500;
          
          // Filter sensitive data from error
          const filteredError = this.sensitiveDataFilter.filterError(error);

          this.logger.error(
            `${method} ${url} ${statusCode} ${responseTime}ms - ${this.sensitiveDataFilter.filterString(ip)} - ${userAgent} - ${filteredError.message}`,
            filteredError.stack,
          );
        }
      }),
    );
  }
  
  /**
   * Filter sensitive headers
   * @param headers Request headers
   * @returns Filtered headers
   */
  private filterHeaders(headers: any): any {
    const filtered = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'set-cookie',
      'proxy-authorization',
    ];
    
    for (const header of sensitiveHeaders) {
      if (filtered[header]) {
        filtered[header] = '[REDACTED]';
      }
    }
    
    return filtered;
  }
}