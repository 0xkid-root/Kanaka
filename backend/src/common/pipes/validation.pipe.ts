import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  ValidationError,
  ValidationPipeOptions,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AppLoggerService } from '../services/logging.service';
import { SensitiveDataFilter } from '../filters/sensitive-data.filter';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger: AppLoggerService;
  private readonly options: ValidationPipeOptions;

  constructor(
    options: ValidationPipeOptions = {},
    private readonly sensitiveDataFilter?: SensitiveDataFilter,
    loggerService?: AppLoggerService,
  ) {
    this.options = {
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      ...options,
    };
    
    if (loggerService) {
      this.logger = loggerService.createLogger(CustomValidationPipe.name);
    }
  }

  async transform(value: any, { metatype, type, data }: ArgumentMetadata) {
    // Skip validation if no metatype or if it's a primitive type
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    
    // Skip validation for empty values if not required
    if (value === undefined && !this.options.validateCustomDecorators) {
      return value;
    }
    
    // Transform plain objects to class instances
    const object = plainToInstance(metatype, value);
    
    // Validate the object
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      forbidUnknownValues: this.options.forbidUnknownValues,
      skipMissingProperties: this.options.skipMissingProperties,
    });
    
    // If there are validation errors, throw a BadRequestException
    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      
      // Log the validation error (with sensitive data filtered)
      if (this.logger) {
        const filteredValue = this.sensitiveDataFilter 
          ? this.sensitiveDataFilter.filterObject(value)
          : value;
          
        this.logger.debug(`Validation failed for ${metatype.name}`, {
          value: filteredValue,
          errors: formattedErrors,
          type,
          data,
        });
      }
      
      throw new BadRequestException({
        message: 'Validation failed',
        error: 'Bad Request',
        details: formattedErrors,
      });
    }
    
    // Return the transformed object if transform is enabled
    return this.options.transform ? object : value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]) {
    return errors.reduce((acc, error) => {
      const constraints = error.constraints || {};
      const messages = Object.values(constraints);
      
      if (messages.length) {
        acc[error.property] = messages[0];
      }
      
      if (error.children && error.children.length) {
        const childErrors = this.formatErrors(error.children);
        Object.keys(childErrors).forEach(key => {
          acc[`${error.property}.${key}`] = childErrors[key];
        });
      }
      
      return acc;
    }, {});
  }
}