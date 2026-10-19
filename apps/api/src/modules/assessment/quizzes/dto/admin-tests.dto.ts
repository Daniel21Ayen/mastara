import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsArray,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CatalogStatus, QuestionForm, QuizNumber } from "@mastara/domain";

export class AdminQuestionInputDto {
  @ApiProperty({ description: "UUID of the course" })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ enum: [1, 2, 3], description: "Quiz number (1, 2, or 3)" })
  @IsInt()
  @Min(1)
  @Max(3)
  quizNo!: QuizNumber;

  @ApiProperty({ description: "UUID of the syllabus topic" })
  @IsString()
  @IsNotEmpty()
  topicId!: string;

  @ApiProperty({ description: "Short descriptive question title" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "BLANK_SPACE"],
    description: "Question form",
  })
  @IsEnum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "BLANK_SPACE"])
  form!: QuestionForm;

  @ApiProperty({ description: "Markdown/Math question prompt" })
  @IsString()
  prompt!: string;

  @ApiProperty({ type: [String], description: "Options for multiple choice" })
  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @ApiPropertyOptional({ description: "Index of correct option in options array" })
  @IsOptional()
  @IsInt()
  correctOption?: number | null;

  @ApiPropertyOptional({ description: "Boolean answer for True/False question" })
  @IsOptional()
  @IsBoolean()
  trueIsCorrect?: boolean | null;

  @ApiProperty({ type: [String], description: "Accepted answers for short answer or blank space" })
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers!: string[];

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Publication status" })
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status!: CatalogStatus;

  @ApiPropertyOptional({ description: "Reason for state change (required when unpublishing)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminQuizSettingsInputDto {
  @ApiProperty({ description: "Allowed duration in minutes (5 - 180)" })
  @IsInt()
  @Min(5)
  @Max(180)
  minutes!: number;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Publication status" })
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status!: CatalogStatus;

  @ApiPropertyOptional({ description: "Reason for unpublishing" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminQuestionListQueryDto {
  @ApiProperty({ enum: [1, 2, 3], description: "Quiz number filter" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  quizNo!: QuizNumber;

  @ApiPropertyOptional({ description: "Optional course UUID filter" })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "BLANK_SPACE"],
    description: "Filter by question form",
  })
  @IsOptional()
  @IsEnum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "BLANK_SPACE"])
  form?: QuestionForm;

  @ApiPropertyOptional({
    enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
    description: "Filter by status",
  })
  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: CatalogStatus;

  @ApiPropertyOptional({ description: "Text search filter across prompt, title, and topic" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: "Page number (defaults to 1)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
