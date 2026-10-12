import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { AttemptCategory } from "@mastara/database";

export class StartAttemptDto {
  @ApiProperty({
    enum: AttemptCategory,
    example: AttemptCategory.EXAM,
    description: "Assessment category: PRACTICE, QUIZ, EXAM, or COC",
  })
  @IsEnum(AttemptCategory, {
    message: "category must be PRACTICE, QUIZ, EXAM, or COC",
  })
  category!: AttemptCategory;

  @ApiPropertyOptional({
    description: "UUID of the exam (required when category is EXAM)",
    example: "a0000000-0000-0000-0000-000000000001",
  })
  @IsOptional()
  @IsUUID("all", { message: "examId must be a valid UUID" })
  examId?: string;

  @ApiPropertyOptional({
    description: "UUID of the COC set (required when category is COC)",
    example: "b0000000-0000-0000-0000-000000000001",
  })
  @IsOptional()
  @IsUUID("all", { message: "cocSetId must be a valid UUID" })
  cocSetId?: string;

  @ApiPropertyOptional({
    description: "UUID of the topic (for QUIZ or PRACTICE)",
    example: "c0000000-0000-0000-0000-000000000001",
  })
  @IsOptional()
  @IsUUID("all", { message: "topicId must be a valid UUID" })
  topicId?: string;

  @ApiPropertyOptional({
    description: "Quiz number (1, 2, or 3 for QUIZ category)",
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: "quizNo must be an integer" })
  @Min(1, { message: "quizNo must be at least 1" })
  @Max(3, { message: "quizNo must be at most 3" })
  quizNo?: number;
}
