import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { AttemptCategory } from "@mastara/database";

export class GetAttemptsQueryDto {
  @ApiPropertyOptional({
    enum: AttemptCategory,
    description: "Filter by attempt category (PRACTICE, QUIZ, EXAM, COC)",
  })
  @IsOptional()
  @IsEnum(AttemptCategory, {
    message: "category must be PRACTICE, QUIZ, EXAM, or COC",
  })
  category?: AttemptCategory;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page must be an integer" })
  @Min(1, { message: "page must be at least 1" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Results per page (max 50)",
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(50, { message: "limit must be at most 50" })
  limit?: number = 10;
}
