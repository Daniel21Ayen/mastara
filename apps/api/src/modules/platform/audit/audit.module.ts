import { Global, Module } from "@nestjs/common";
import { AuditService } from "./services/audit.service";
import { AdminAuditController } from "./controllers/admin-audit.controller";

@Global()
@Module({
  controllers: [AdminAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
