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
