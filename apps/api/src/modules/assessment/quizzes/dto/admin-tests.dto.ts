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
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CatalogStatus, QuestionForm, QuizNumber, ExamSetKind, Stream } from "@mastara/domain";

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
  @ApiPropertyOptional({ description: "Allowed duration in minutes (deprecated for quizzes)" })
  @IsOptional()
  @IsInt()
  minutes?: number;

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

export class AdminExamSetListQueryDto {
  @ApiProperty({ enum: ["MID", "FINAL", "MOCK", "COC"], description: "Kind of exam set" })
  @IsEnum(["MID", "FINAL", "MOCK", "COC"])
  kind!: ExamSetKind;

  @ApiPropertyOptional({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Status filter" })
  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: CatalogStatus;

  @ApiPropertyOptional({ description: "Text search matching set ID, question ID, course or program" })
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

export class AdminExamQuestionInputDto {
  @ApiProperty({ description: "Admin-typed Question ID" })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "BLANK_SPACE"],
    description: "Question form",
  })
  @IsEnum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "BLANK_SPACE"])
  form!: QuestionForm;

  @ApiProperty({ description: "Topic of question" })
  @IsString()
  topic!: string;

  @ApiProperty({ description: "Question prompt" })
  @IsString()
  prompt!: string;

  @ApiProperty({ type: [String], description: "Options for multiple choice" })
  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @ApiPropertyOptional({ description: "Correct option index" })
  @IsOptional()
  correctOption?: number | null;

  @ApiPropertyOptional({ description: "True is correct boolean" })
  @IsOptional()
  trueIsCorrect?: boolean | null;

  @ApiProperty({ type: [String], description: "Accepted answers" })
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers!: string[];

  @ApiPropertyOptional({ description: "Explanation / answer description" })
  @IsOptional()
  @IsString()
  answerDescription?: string;
}

export class AdminExamSetInputDto {
  @ApiProperty({ description: "Admin-assigned Exam Set ID (e.g. EXAM-SET-1041)" })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ enum: ["MID", "FINAL", "MOCK", "COC"], description: "Kind of exam set" })
  @IsEnum(["MID", "FINAL", "MOCK", "COC"])
  kind!: ExamSetKind;

  @ApiProperty({ description: "University UUID (can be 'none' for MOCK/COC)" })
  @IsString()
  universityId!: string;

  @ApiProperty({ description: "Program UUID" })
  @IsString()
  programId!: string;

  @ApiProperty({ enum: [1, 2], description: "Semester number (1 or 2)" })
  @IsInt()
  semesterNumber!: 1 | 2;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL"], description: "Stream" })
  @IsEnum(["NATURAL", "SOCIAL"])
  stream!: Stream;

  @ApiPropertyOptional({ description: "Course UUID (nullable for COC)" })
  @IsOptional()
  courseId?: string | null;

  @ApiPropertyOptional({ description: "Academic year (e.g. 2024)" })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiProperty({ description: "Is this free trial" })
  @IsBoolean()
  isFree!: boolean;

  @ApiProperty({ description: "Allowed duration in minutes" })
  @IsInt()
  minutes!: number;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Status" })
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status!: CatalogStatus;

  @ApiProperty({ type: [AdminExamQuestionInputDto], description: "List of exam questions" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminExamQuestionInputDto)
  questions!: AdminExamQuestionInputDto[];

  @ApiPropertyOptional({ description: "Reason for unpublishing" })
  @IsOptional()
  @IsString()
  reason?: string;
}

