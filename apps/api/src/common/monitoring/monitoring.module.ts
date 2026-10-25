// apps/api/src/common/monitoring/monitoring.module.ts
import { Global, Module } from '@nestjs/common';
import { ErrorTrackingService } from './error-tracking.service';
import { AlertsService } from './alerts.service';

@Global()
@Module({
  providers: [ErrorTrackingService, AlertsService],
  exports: [ErrorTrackingService, AlertsService],
})
export class MonitoringModule {}
