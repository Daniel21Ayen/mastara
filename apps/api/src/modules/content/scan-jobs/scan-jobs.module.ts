import { Module } from "@nestjs/common";
import { AdminScansController } from "./controllers/admin-scans.controller";
import { AdminScansService } from "./services/admin-scans.service";
import { StorageModule } from "../../../infrastructure/storage/storage.module";
import { QueueModule } from "../../../infrastructure/queue/queue.module";

@Module({
  imports: [StorageModule, QueueModule],
  controllers: [AdminScansController],
  providers: [AdminScansService],
  exports: [AdminScansService],
})
export class ScanJobsModule {}
