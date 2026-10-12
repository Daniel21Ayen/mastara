import { Module } from "@nestjs/common";
import { PaymentProofsController } from "./controllers/payment-proofs.controller";
import { PaymentProofsService } from "./services/payment-proofs.service";
import { AuditModule } from "../../platform/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PaymentProofsController],
  providers: [PaymentProofsService],
  exports: [PaymentProofsService],
})
export class PaymentProofsModule {}
