// apps/api/src/common/monitoring/error-tracking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ErrorContext {
  userId?: string;
  deviceId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
}

export interface Breadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
  timestamp?: number;
  data?: Record<string, unknown>;
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private readonly sentryDsn?: string;
  private readonly environment: string;
  private readonly isEnabled: boolean;
  private readonly breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs = 50;

  constructor(private readonly config: ConfigService) {
    this.sentryDsn = this.config.get<string>('SENTRY_DSN');
    this.environment = this.config.get<string>('NODE_ENV', 'development');
    this.isEnabled = Boolean(this.sentryDsn) || this.environment === 'production';

    if (this.sentryDsn) {
      this.logger.log(`Error tracking initialized with Sentry DSN in ${this.environment} mode.`);
    } else {
      this.logger.log(`Error tracking active in structured log fallback mode (${this.environment}).`);
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: breadcrumb.timestamp ?? Date.now(),
    });
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  captureException(error: unknown, context: ErrorContext = {}): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;

    const payload = {
      event_id: errorId,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      error: {
        message: errMessage,
        stack: errStack,
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      context: {
        ...context,
        breadcrumbs: [...this.breadcrumbs],
      },
    };

    // Structured JSON logging for error tracking & ingestion (e.g. Datadog / CloudWatch / Sentry forwarder)
    this.logger.error(`[ERROR_TRACKING] ${JSON.stringify(payload)}`);

    // If Sentry DSN is present, we could post to Sentry Store API asynchronously without blocking
    if (this.sentryDsn) {
      this.sendToSentryAsync(payload).catch((sendErr) => {
        this.logger.warn(`Failed to dispatch event to Sentry DSN: ${sendErr?.message}`);
      });
    }

    return errorId;
  }

  captureMessage(message: string, level: 'info' | 'warn' | 'error' = 'info', context: ErrorContext = {}): string {
    const eventId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload = {
      event_id: eventId,
      level,
      message,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      context,
    };
    if (level === 'error') {
      this.logger.error(`[ERROR_TRACKING_MSG] ${JSON.stringify(payload)}`);
    } else if (level === 'warn') {
      this.logger.warn(`[ERROR_TRACKING_MSG] ${JSON.stringify(payload)}`);
    } else {
      this.logger.log(`[ERROR_TRACKING_MSG] ${JSON.stringify(payload)}`);
    }
    return eventId;
  }

  private async sendToSentryAsync(payload: Record<string, unknown>): Promise<void> {
    try {
      if (!this.sentryDsn) return;
      const dsnUrl = new URL(this.sentryDsn);
      const projectId = dsnUrl.pathname.replace(/^\//, '');
      const storeEndpoint = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/store/`;

      const response = (await fetch(storeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=mastara-backend/1.0, sentry_key=${dsnUrl.username}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      })) as { ok?: boolean; status?: number };

      if (!response.ok) {
        this.logger.debug(`Sentry returned HTTP status ${response.status}`);
      }
    } catch {
      // Never crash or fail user request on telemetry dispatch
    }
  }
}
