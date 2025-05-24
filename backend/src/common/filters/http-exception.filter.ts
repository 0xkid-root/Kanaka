import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../services/logging.service';
import { BlockchainError, BlockchainErrorType, ErrorHandlerService } from '../services/error-handler.service';
import { SensitiveDataFilter } from './sensitive-data.filter';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger: AppLoggerService;

  constructor(
    @Inject(AppLoggerService) loggerService: AppLoggerService,
    @Inject(ErrorHandlerService) private errorHandler: ErrorHandlerService,
    @Inject(SensitiveDataFilter) private sensitiveDataFilter?: SensitiveDataFilter,
  ) {
    this.logger = loggerService.createLogger(HttpExceptionFilter.name);
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle blockchain errors
    if (exception.type && Object.values(BlockchainErrorType).includes(exception.type)) {
      return this.handleBlockchainError(exception as BlockchainError, request, response);
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let details = null;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).error || errorCode;
        details = (exceptionResponse as any).details || null;
      }
    } 
    // Try to convert other errors to blockchain errors if possible
    else if (exception.code && typeof exception.code === 'string') {
      try {
        const blockchainError = this.errorHandler.handleBlockchainError(exception, `${request.method} ${request.url}`);
        return this.handleBlockchainError(blockchainError, request, response);
      } catch (conversionError) {
        // If conversion fails, continue with standard error handling
        if (exception.message) {
          message = exception.message;
        }
      }
    } 
    // Standard error handling
    else if (exception.message) {
      message = exception.message;
    }

    // Filter sensitive data from error message and stack trace
    const filteredMessage = this.sensitiveDataFilter 
      ? this.sensitiveDataFilter.filterString(message)
      : message;
    
    const filteredStack = this.sensitiveDataFilter && exception.stack
      ? this.sensitiveDataFilter.filterString(exception.stack)
      : exception.stack;
    
    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${filteredMessage}`,
      filteredStack,
    );

    // Filter sensitive data from details
    const filteredDetails = this.sensitiveDataFilter && details
      ? this.sensitiveDataFilter.filterObject(details)
      : details;
    
    // Return a consistent error response
    response.status(status).json({
      statusCode: status,
      error: errorCode,
      message: filteredMessage,
      details: filteredDetails,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }

  /**
   * Handle blockchain-specific errors
   */
  private handleBlockchainError(error: BlockchainError, request: Request, response: Response) {
    let status: HttpStatus;
    
    // Map blockchain error types to HTTP status codes
    switch (error.type) {
      case BlockchainErrorType.UNAUTHORIZED:
        status = HttpStatus.UNAUTHORIZED;
        break;
        
      case BlockchainErrorType.INVALID_ARGUMENT:
        status = HttpStatus.BAD_REQUEST;
        break;
        
      case BlockchainErrorType.RATE_LIMIT:
        status = HttpStatus.TOO_MANY_REQUESTS;
        break;
        
      case BlockchainErrorType.NETWORK_ERROR:
      case BlockchainErrorType.TIMEOUT:
        status = HttpStatus.SERVICE_UNAVAILABLE;
        break;
        
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        break;
    }
    
    // Filter sensitive data from blockchain error
    const filteredMessage = this.sensitiveDataFilter 
      ? this.sensitiveDataFilter.filterString(error.message)
      : error.message;
    
    const filteredStack = this.sensitiveDataFilter && error.originalError?.stack
      ? this.sensitiveDataFilter.filterString(error.originalError.stack)
      : error.originalError?.stack;
    
    // Filter sensitive data from error data
    const filteredData = this.sensitiveDataFilter && error.data
      ? this.sensitiveDataFilter.filterObject(error.data)
      : error.data;
    
    // Log the blockchain error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - [${error.type}] ${filteredMessage}`,
      filteredStack,
    );
    
    // Get a user-friendly message
    const userMessage = this.errorHandler.getUserFriendlyMessage(error);
    const filteredUserMessage = this.sensitiveDataFilter
      ? this.sensitiveDataFilter.filterString(userMessage)
      : userMessage;
    
    // Return a consistent error response
    response.status(status).json({
      statusCode: status,
      error: error.type,
      code: error.code,
      message: filteredUserMessage,
      details: filteredMessage, // Technical details for debugging
      data: filteredData,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}