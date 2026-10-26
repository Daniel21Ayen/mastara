import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../infrastructure/database/database.module";
import { TotpService } from "../../../common/security/totp.service";
import { AdminsController } from "./controllers/admins.controller";
import { AdminsService } from "./services/admins.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminsController],
  providers: [AdminsService, TotpService],
  exports: [AdminsService],
})
export class AdminsModule {}
