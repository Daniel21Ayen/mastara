import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.validation";

import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { StorageModule } from "./infrastructure/storage/storage.module";
import { PushModule } from "./infrastructure/push/push.module";
import { QueueModule } from "./infrastructure/queue/queue.module";
import { HealthModule } from "./modules/platform/health/health.module";
import { AuditModule } from "./modules/platform/audit/audit.module";
import { DashboardModule } from "./modules/platform/dashboard/dashboard.module";
import { AuthModule } from "./modules/identity/auth/auth.module";
import { DevicesModule } from "./modules/identity/devices/devices.module";
import { StudentsModule } from "./modules/identity/students/students.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ContentModule } from "./modules/content/content.module";
import { LearningModule } from "./modules/learning/learning.module";
import { AssessmentModule } from "./modules/assessment/assessment.module";
import { CommerceModule } from "./modules/commerce/commerce.module";
import { SyncModule } from "./modules/sync/sync.module";
import { EngagementModule } from "./modules/engagement/engagement.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { CsrfMutationGuard } from "./common/guards/csrf-mutation.guard";
import { HttpExceptionFilter } from "./common/filters/error-codes.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    DatabaseModule,
    StorageModule,
    PushModule,
    QueueModule,
    // Platform
    
    HealthModule,
    AuditModule,
    DashboardModule,
    // Identity
    AuthModule,
    DevicesModule,
    StudentsModule,
    // Academic
    CatalogModule,
    ContentModule,
    LearningModule,
    // Assessment
    AssessmentModule,
    // Commerce (B5 + B6)
    CommerceModule,
    // Sync (B6)
    SyncModule,
    // Engagement (B6)
    EngagementModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfMutationGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
