// apps/api/src/common/monitoring/alerts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AlertRecord {
  type: 'SLOW_QUERY' | 'HIGH_ERROR_RATE' | 'CRITICAL_FAILURE';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  details: Record<string, unknown>;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly slowQueryThresholdMs: number;
  private readonly errorRateThresholdPercent: number;
  private readonly errorCountThreshold: number;
  private readonly windowMs = 60000; // 1-minute sliding window

  private readonly recentErrors: number[] = [];
  private readonly recentRequests: number[] = [];
  private readonly alertHistory: AlertRecord[] = [];
  private lastErrorAlertTime = 0;

  constructor(private readonly config: ConfigService) {
    this.slowQueryThresholdMs = this.config.get<number>('SLOW_QUERY_THRESHOLD_MS', 150);
    this.errorRateThresholdPercent = this.config.get<number>('ALERT_ERROR_RATE_PERCENT', 5);
    this.errorCountThreshold = this.config.get<number>('ALERT_ERROR_COUNT_MIN', 5);
  }

  /**
   * Tracks incoming request and HTTP status for error rate alert calculation.
   */
  recordRequest(statusCode: number): void {
    const now = Date.now();
    this.recentRequests.push(now);
    this.pruneOldEntries(this.recentRequests, now);

    if (statusCode >= 500) {
      this.recentErrors.push(now);
      this.pruneOldEntries(this.recentErrors, now);
      this.checkErrorRateAlert(now);
    }
  }

  /**
   * Evaluates if database query duration exceeds threshold and fires SLOW_QUERY_ALERT.
   */
  recordQuery(query: string, durationMs: number, params?: unknown): void {
    if (durationMs >= this.slowQueryThresholdMs) {
      const alert: AlertRecord = {
        type: 'SLOW_QUERY',
        severity: durationMs > this.slowQueryThresholdMs * 3 ? 'critical' : 'warning',
        message: `Database query exceeded latency threshold: ${durationMs}ms >= ${this.slowQueryThresholdMs}ms`,
        timestamp: new Date().toISOString(),
        details: {
          durationMs,
          thresholdMs: this.slowQueryThresholdMs,
          query: query.length > 500 ? `${query.substring(0, 500)}... [truncated]` : query,
          params: params ? JSON.stringify(params) : undefined,
        },
      };

      this.alertHistory.push(alert);
      if (this.alertHistory.length > 100) this.alertHistory.shift();

      this.logger.warn(`[SLOW_QUERY_ALERT] ${JSON.stringify(alert)}`);
    }
  }

  private checkErrorRateAlert(now: number): void {
    const total = this.recentRequests.length;
    const errors = this.recentErrors.length;
    if (total === 0 || errors < this.errorCountThreshold) return;

    const ratePercent = (errors / total) * 100;
    // Debounce error rate alerts by 30 seconds
    if (ratePercent >= this.errorRateThresholdPercent && now - this.lastErrorAlertTime > 30000) {
      this.lastErrorAlertTime = now;
      const alert: AlertRecord = {
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: `Elevated 5xx error rate detected: ${ratePercent.toFixed(1)}% (${errors}/${total} requests in last 60s)`,
        timestamp: new Date(now).toISOString(),
        details: {
          errorCount: errors,
          totalRequests: total,
          ratePercent,
          thresholdPercent: this.errorRateThresholdPercent,
        },
      };

      this.alertHistory.push(alert);
      if (this.alertHistory.length > 100) this.alertHistory.shift();

      this.logger.error(`[HIGH_ERROR_RATE_ALERT] ${JSON.stringify(alert)}`);
    }
  }

  private pruneOldEntries(arr: number[], now: number): void {
    const cutoff = now - this.windowMs;
    while (arr.length > 0 && (arr[0] ?? Infinity) < cutoff) {
      arr.shift();
    }
  }

  getMetrics() {
    const now = Date.now();
    this.pruneOldEntries(this.recentRequests, now);
    this.pruneOldEntries(this.recentErrors, now);

    const total = this.recentRequests.length;
    const errors = this.recentErrors.length;
    const errorRatePercent = total > 0 ? (errors / total) * 100 : 0;

    return {
      windowSeconds: this.windowMs / 1000,
      totalRequests: total,
      totalErrors: errors,
      errorRatePercent: Math.round(errorRatePercent * 10) / 10,
      slowQueryThresholdMs: this.slowQueryThresholdMs,
      recentAlerts: [...this.alertHistory].slice(-10),
    };
  }
}
