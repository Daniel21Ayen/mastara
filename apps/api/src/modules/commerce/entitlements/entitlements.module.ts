import { Module } from "@nestjs/common";
import { EntitlementsController } from "./controllers/entitlements.controller";
import { EntitlementsService } from "./services/entitlements.service";

@Module({
  controllers: [EntitlementsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
