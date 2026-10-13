import { Module } from "@nestjs/common";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { ExamsModule } from "./exams/exams.module";
import { CocModule } from "./coc/coc.module";
import { AttemptsModule } from "./attempts/attempts.module";

@Module({
  imports: [QuizzesModule, ExamsModule, CocModule, AttemptsModule],
  exports: [QuizzesModule, ExamsModule, CocModule, AttemptsModule],
})
export class AssessmentModule {}
