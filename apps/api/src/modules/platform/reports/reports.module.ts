import { Module } from "@nestjs/common";
import { AdminReportsController } from "./controllers/admin-reports.controller";
import { ReportsService } from "./services/reports.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
