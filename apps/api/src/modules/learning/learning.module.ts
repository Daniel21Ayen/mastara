import { Module } from "@nestjs/common";
import { LearningController } from "./controllers/learning.controller";
import { LearningService } from "./services/learning.service";

@Module({
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}
