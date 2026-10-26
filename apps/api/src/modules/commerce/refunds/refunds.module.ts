import { Module } from "@nestjs/common";
import { AdminRefundsController } from "./controllers/admin-refunds.controller";
import { RefundsService } from "./services/refunds.service";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { PushModule } from "../../../infrastructure/push/push.module";
import { AuditModule } from "../../platform/audit/audit.module";

@Module({
  imports: [DatabaseModule, PushModule, AuditModule],
  controllers: [AdminRefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
