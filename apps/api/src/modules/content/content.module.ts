import { Module } from "@nestjs/common";
import { ContentController } from "./controllers/content.controller";
import { AdminContentController } from "./controllers/admin-content.controller";
import { ContentService } from "./services/content.service";
import { ScanJobsModule } from "./scan-jobs/scan-jobs.module";
import { DeviceGuard } from "../../common/guards/device.guard";

@Module({
  imports: [ScanJobsModule],
  controllers: [ContentController, AdminContentController],
  providers: [ContentService, DeviceGuard],
  exports: [ContentService, ScanJobsModule],
})
export class ContentModule {}
