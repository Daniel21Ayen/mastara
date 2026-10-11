import { Module } from "@nestjs/common";
import { ExamsController } from "./controllers/exams.controller";
import { ExamsService } from "./services/exams.service";

@Module({
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
