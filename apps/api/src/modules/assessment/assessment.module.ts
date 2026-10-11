import { Module } from "@nestjs/common";
import { QuizzesModule } from "./quizzes/quizzes.module";

@Module({
  imports: [QuizzesModule],
  exports: [QuizzesModule],
})
export class AssessmentModule {}
