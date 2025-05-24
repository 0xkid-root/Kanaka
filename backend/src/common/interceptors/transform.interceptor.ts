import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Reflector,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta: {
    status: number;
    timestamp: string;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}
  
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // Check if the handler has the SkipTransform decorator
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      'skipTransform',
      [context.getHandler(), context.getClass()],
    );
    
    if (skipTransform) {
      return next.handle();
    }
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          status: statusCode,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}