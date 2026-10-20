import { Module } from "@nestjs/common";
import { AdminScansController } from "./controllers/admin-scans.controller";
import { AdminScansService } from "./services/admin-scans.service";

@Module({
  controllers: [AdminScansController],
  providers: [AdminScansService],
  exports: [AdminScansService],
})
export class ScanJobsModule {}
