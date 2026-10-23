import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AuditAction, AuditActor } from "@mastara/domain";

export class AuditEntryDto {
  @ApiProperty({
    example: "a3b84178-5a67-4e6c-9411-e6a2bb0364f2",
    description: "Unique audit log ID",
  })
  id!: string;

  @ApiProperty({
    example: "2026-10-22T03:00:00.000Z",
    description: "ISO timestamp of event",
  })
  at!: string;

  @ApiProperty({
    enum: ["ADMIN", "STUDENT", "SYSTEM"],
    example: "ADMIN",
    description: "Actor who performed the action",
  })
  actor!: AuditActor;

  @ApiProperty({
    example: "PAYMENT_REJECTED",
    description: "Audit action type",
  })
  action!: AuditAction;

  @ApiProperty({
    example: "Order · Selam Getachew",
    description: "Target entity description",
  })
  target!: string;

  @ApiPropertyOptional({
    example: "Unreadable or blurry bank slip",
    description: "Reason or context for sensitive action",
  })
  reason?: string;
}
