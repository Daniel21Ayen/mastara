import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class AdminBulkQuestionImportDto {
  @ApiPropertyOptional({
    description: "Raw CSV or JSON string content when not uploading via multipart file",
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description:
      "When true (default), validates questions and returns preview without database commits",
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  dryRun: boolean = true;

  @ApiPropertyOptional({
    description: "Target Exam Set ID (e.g. EXAM-SET-1041) to attach imported questions to",
  })
  @IsOptional()
  @IsString()
  targetExamSetId?: string;

  @ApiPropertyOptional({
    description: "Target Course UUID if importing questions for a specific course",
  })
  @IsOptional()
  @IsString()
  courseId?: string;
}
