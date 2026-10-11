import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ExamKind } from "@mastara/database";

export class GetExamsQueryDto {
  @ApiPropertyOptional({
    enum: ExamKind,
    example: ExamKind.MID,
    description: "Filter exams by kind: MID, FINAL, or MOCK",
  })
  @IsOptional()
  @IsEnum(ExamKind, { message: "kind must be MID, FINAL, or MOCK" })
  kind?: ExamKind;
}
