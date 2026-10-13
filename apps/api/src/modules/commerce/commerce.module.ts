import { Module } from "@nestjs/common";
import { PricingModule } from "./pricing/pricing.module";
import { ProductsModule } from "./products/products.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentProofsModule } from "./payment-proofs/payment-proofs.module";
import { EntitlementsModule } from "./entitlements/entitlements.module";
import { ExpiryModule } from "./expiry/expiry.module";

@Module({
  imports: [
    PricingModule,
    ProductsModule,
    OrdersModule,
    PaymentProofsModule,
    EntitlementsModule,
    ExpiryModule,
  ],
  exports: [
    PricingModule,
    ProductsModule,
    OrdersModule,
    PaymentProofsModule,
    EntitlementsModule,
  ],
})
export class CommerceModule {}
