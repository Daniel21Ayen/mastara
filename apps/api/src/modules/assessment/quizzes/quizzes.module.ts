import { Module } from "@nestjs/common";
import { QuizzesController } from "./controllers/quizzes.controller";
import { QuizzesService } from "./services/quizzes.service";
import { AdminTestsController } from "./controllers/admin-tests.controller";
import { AdminTestsService } from "./services/admin-tests.service";

@Module({
  controllers: [QuizzesController, AdminTestsController],
  providers: [QuizzesService, AdminTestsService],
  exports: [QuizzesService, AdminTestsService],
})
export class QuizzesModule {}

