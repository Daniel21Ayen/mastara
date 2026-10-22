import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { SUPPORT_MESSAGE_MAX } from "@mastara/domain";
import { TicketStatus } from "@mastara/database";

export class CreateTicketDto {
  @ApiProperty({
    description: "Short subject describing the issue",
    example: "Cannot access Calculus chapter 3",
  })
  @IsString()
  @MinLength(3, { message: "subject must be at least 3 characters" })
  @MaxLength(120, { message: "subject must be at most 120 characters" })
  subject!: string;

  @ApiProperty({
    description: "Initial message body",
    example: "After purchasing the bundle, chapter 3 still shows as locked.",
  })
  @IsString()
  @MinLength(5, { message: "message must be at least 5 characters" })
  @MaxLength(SUPPORT_MESSAGE_MAX, {
    message: `message must be at most ${SUPPORT_MESSAGE_MAX} characters`,
  })
  message!: string;
}

export class AddMessageDto {
  @ApiProperty({
    description: "Message body to add to the ticket",
    example: "I have tried logging out and back in — still locked.",
  })
  @IsString()
  @MinLength(1, { message: "body must not be empty" })
  @MaxLength(SUPPORT_MESSAGE_MAX, {
    message: `body must be at most ${SUPPORT_MESSAGE_MAX} characters`,
  })
  body!: string;
}

export class GetTicketsQueryDto {
  @ApiPropertyOptional({
    enum: TicketStatus,
    description: "Filter tickets by status",
  })
  @IsOptional()
  @IsEnum(TicketStatus, { message: "status must be a valid TicketStatus" })
  status?: TicketStatus;
}

export class AdminTicketsQueryDto {
  @ApiPropertyOptional({
    enum: TicketStatus,
    description: "Filter tickets by status",
  })
  @IsOptional()
  @IsEnum(TicketStatus, { message: "status must be a valid TicketStatus" })
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: "Filter tickets by category (PAYMENT, DEVICE, ACCESS, EXAMS, GENERAL)",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Filter tickets by priority (LOW, NORMAL, HIGH, URGENT)",
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({
    description: "Search term across subject, student name, identifier, and messages",
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: "Page size",
    default: 20,
  })
  @IsOptional()
  pageSize?: number;
}

export class ReplyTicketDto {
  @ApiProperty({
    description: "Admin reply message to the student",
    example: "We have reviewed your CBE payment reference and unlocked your semester bundle.",
  })
  @IsString()
  @MinLength(2, { message: "message must be at least 2 characters" })
  @MaxLength(SUPPORT_MESSAGE_MAX, {
    message: `message must be at most ${SUPPORT_MESSAGE_MAX} characters`,
  })
  message!: string;
}

export class SetTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    description: "New ticket status",
    example: TicketStatus.RESOLVED,
  })
  @IsEnum(TicketStatus, { message: "status must be a valid TicketStatus" })
  status!: TicketStatus;
}
