import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

export class SubmitAnswerItemDto {
  @ApiProperty({
    description: "UUID of the question being answered",
    example: "q0000000-0000-0000-0000-000000000001",
  })
  @IsUUID("all", { message: "questionId must be a valid UUID" })
  questionId!: string;

  @ApiProperty({
    description: "Selected option IDs or text answer string(s)",
    example: ["opt-a"],
    type: [String],
  })
  @IsArray({ message: "selectedAnswers must be an array" })
  @IsString({ each: true, message: "each selected answer must be a string" })
  selectedAnswers!: string[];

  @ApiPropertyOptional({
    description: "Whether the question was flagged for review by the student",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: "isFlagged must be a boolean" })
  isFlagged?: boolean;

  @ApiProperty({
    description: "Timestamp when the student answered the question (ISO-8601)",
    example: "2026-10-12T14:30:00.000Z",
  })
  @IsDateString({}, { message: "clientTimestamp must be a valid ISO-8601 string" })
  clientTimestamp!: string;
}

export class SubmitAttemptDto {
  @ApiProperty({
    description: "List of submitted answers for the attempt",
    type: [SubmitAnswerItemDto],
  })
  @IsArray({ message: "answers must be an array" })
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers!: SubmitAnswerItemDto[];

  @ApiPropertyOptional({
    description: "Elapsed duration reported by client in milliseconds",
    example: 450000,
  })
  @IsOptional()
  @IsInt({ message: "elapsedMs must be an integer" })
  @Min(0, { message: "elapsedMs must be non-negative" })
  elapsedMs?: number;
}
