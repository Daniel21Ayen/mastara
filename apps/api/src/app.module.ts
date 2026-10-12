import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { HealthModule } from "./modules/platform/health/health.module";
import { AuthModule } from "./modules/identity/auth/auth.module";
import { DevicesModule } from "./modules/identity/devices/devices.module";
import { StudentsModule } from "./modules/identity/students/students.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ContentModule } from "./modules/content/content.module";
import { LearningModule } from "./modules/learning/learning.module";
import { AssessmentModule } from "./modules/assessment/assessment.module";
import { CommerceModule } from "./modules/commerce/commerce.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { HttpExceptionFilter } from "./common/filters/error-codes.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    DevicesModule,
    StudentsModule,
    CatalogModule,
    ContentModule,
    LearningModule,
    AssessmentModule,
    CommerceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
