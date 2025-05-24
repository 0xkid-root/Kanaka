import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlerService, BlockchainError } from '../services/error-handler.service';
import { AppLoggerService } from '../services/logging.service';

/**
 * Interceptor that catches blockchain errors and converts them to HTTP exceptions
 */
@Injectable()
export class BlockchainErrorInterceptor implements NestInterceptor {
  private readonly logger: AppLoggerService;

  constructor(
    private errorHandler: ErrorHandlerService,
    loggerService: AppLoggerService,
  ) {
    this.logger = loggerService.createLogger(BlockchainErrorInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        // Check if this is already a blockchain error
        if (error instanceof BlockchainError || (error.type && error.message)) {
          this.logger.debug(`Converting blockchain error to HTTP exception: ${error.type}`);
          
          // Convert to HTTP exception
          const httpException = this.errorHandler.toHttpException(error);
          return throwError(() => httpException);
        }
        
        // Check if this is a blockchain-related error that needs conversion
        if (error.code && typeof error.code === 'string') {
          try {
            const req = context.switchToHttp().getRequest();
            const path = req ? `${req.method} ${req.url}` : 'unknown';
            
            this.logger.debug(`Handling potential blockchain error in ${path}: ${error.code}`);
            
            // Convert to blockchain error
            const blockchainError = this.errorHandler.handleBlockchainError(error, path);
            
            // Convert to HTTP exception
            const httpException = this.errorHandler.toHttpException(blockchainError);
            return throwError(() => httpException);
          } catch (conversionError) {
            // If conversion fails, pass through the original error
            this.logger.debug(`Error conversion failed: ${conversionError.message}`);
          }
        }
        
        // Pass through other errors
        return throwError(() => error);
      }),
    );
  }
}