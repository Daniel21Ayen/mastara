// apps/api/src/common/interceptors/logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { AlertsService } from '../monitoring/alerts.service';
import { ErrorTrackingService } from '../monitoring/error-tracking.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    private readonly alertsService: AlertsService,
    private readonly errorTracking: ErrorTrackingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const start = Date.now();
    const requestId =
      (req.headers['x-request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Attach request ID to response header for client tracing
    if (res && res.setHeader) {
      res.setHeader('X-Request-Id', requestId);
    }

    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '-';

    this.errorTracking.addBreadcrumb({
      category: 'http',
      message: `${method} ${originalUrl}`,
      level: 'info',
      data: { ip, requestId },
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          const statusCode = res.statusCode || 200;

          this.alertsService.recordRequest(statusCode);

          const logData = {
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'access_log',
            requestId,
            method,
            url: originalUrl,
            statusCode,
            durationMs,
            ip,
            userAgent,
          };

          this.logger.log(JSON.stringify(logData));
        },
        error: (err) => {
          const durationMs = Date.now() - start;
          const statusCode = err?.status || err?.statusCode || 500;

          this.alertsService.recordRequest(statusCode);

          const logData = {
            timestamp: new Date().toISOString(),
            level: statusCode >= 500 ? 'error' : 'warn',
            type: 'error_log',
            requestId,
            method,
            url: originalUrl,
            statusCode,
            durationMs,
            error: err?.message || 'Unknown error',
            ip,
            userAgent,
          };

          if (statusCode >= 500) {
            this.logger.error(JSON.stringify(logData));
          } else {
            this.logger.warn(JSON.stringify(logData));
          }
        },
      }),
    );
  }
}
