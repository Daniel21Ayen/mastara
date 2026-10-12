import { Module } from "@nestjs/common";
import { ExpiryService } from "./services/expiry.service";

@Module({
  providers: [ExpiryService],
})
export class ExpiryModule {}
