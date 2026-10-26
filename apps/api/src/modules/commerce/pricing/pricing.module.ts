import { Module } from "@nestjs/common";
import { PricingController } from "./controllers/pricing.controller";
import { AdminPricingController } from "./controllers/admin-pricing.controller";
import { PricingService } from "./services/pricing.service";

@Module({
  controllers: [PricingController, AdminPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
