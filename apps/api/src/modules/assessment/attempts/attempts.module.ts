import { Module } from "@nestjs/common";
import { AttemptsController } from "./controllers/attempts.controller";
import { AttemptsService } from "./services/attempts.service";

@Module({
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
