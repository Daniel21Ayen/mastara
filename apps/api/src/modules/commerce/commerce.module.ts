import { Module } from "@nestjs/common";
import { PricingModule } from "./pricing/pricing.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [PricingModule, ProductsModule],
  exports: [PricingModule, ProductsModule],
})
export class CommerceModule {}
