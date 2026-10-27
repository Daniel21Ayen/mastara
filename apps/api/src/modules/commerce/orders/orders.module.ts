import { Module } from "@nestjs/common";
import { OrdersController } from "./controllers/orders.controller";
import { OrdersService } from "./services/orders.service";
import { PricingModule } from "../pricing/pricing.module";
import { AuthModule } from "../../identity/auth/auth.module";

@Module({
  imports: [PricingModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
