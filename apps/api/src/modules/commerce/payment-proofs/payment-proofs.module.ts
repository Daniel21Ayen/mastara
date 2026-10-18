import { Module } from "@nestjs/common";
import { PaymentProofsController } from "./controllers/payment-proofs.controller";
import { AdminPaymentsController } from "./controllers/admin-payments.controller";
import { PaymentProofsService } from "./services/payment-proofs.service";
import { AuditModule } from "../../platform/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PaymentProofsController, AdminPaymentsController],
  providers: [PaymentProofsService],
  exports: [PaymentProofsService],
})
export class PaymentProofsModule {}
