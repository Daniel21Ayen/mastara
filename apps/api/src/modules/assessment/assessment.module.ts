import { Module } from "@nestjs/common";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { ExamsModule } from "./exams/exams.module";
import { CocModule } from "./coc/coc.module";

@Module({
  imports: [QuizzesModule, ExamsModule, CocModule],
  exports: [QuizzesModule, ExamsModule, CocModule],
})
export class AssessmentModule {}
