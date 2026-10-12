import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { OutboxType, OUTBOX_TYPES } from "@mastara/domain";

export class OutboxOpDto {
  @ApiProperty({
    description: "Client-generated UUIDv7 that uniquely identifies this operation",
    example: "018f2a5b-3e8c-7d2f-9ab1-234567890abc",
  })
  @IsString({ message: "id must be a string" })
  id!: string;

  @ApiProperty({
    enum: OUTBOX_TYPES,
    example: "ATTEMPT_FINISHED",
    description: "Operation type: PROFILE_SAVED, ATTEMPT_FINISHED, or EXAM_SUBMITTED",
  })
  @IsEnum(OUTBOX_TYPES, { message: "type must be a valid outbox type" })
  type!: OutboxType;

  @ApiProperty({
    description: "JSON payload for the operation",
    example: { attemptId: "uuid", score: 85 },
  })
  @IsObject({ message: "payload must be an object" })
  payload!: Record<string, unknown>;

  @ApiProperty({
    description: "ISO 8601 timestamp of when the change was made on the device",
    example: "2024-11-01T14:30:00.000Z",
  })
  @IsISO8601({ strict: false }, { message: "createdAt must be a valid ISO date-time" })
  createdAt!: string;

  @ApiProperty({
    description: "Client-side sequence number for ordering within a device session",
    required: false,
  })
  @IsOptional()
  @IsInt({ message: "seq must be an integer" })
  seq?: number;
}

export class SyncOutboxDto {
  @ApiProperty({
    description: "Batch of offline operations queued on the device",
    type: [OutboxOpDto],
  })
  @IsArray({ message: "ops must be an array" })
  @ValidateNested({ each: true })
  @Type(() => OutboxOpDto)
  ops!: OutboxOpDto[];
}
