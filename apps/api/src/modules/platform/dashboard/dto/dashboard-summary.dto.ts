import { ApiProperty } from "@nestjs/swagger";

export class DailyStudentCountDto {
  @ApiProperty({ example: "2026-10-17", description: "ISO Date YYYY-MM-DD" })
  date!: string;

  @ApiProperty({ example: 45, description: "Number of students registered on this date" })
  count!: number;
}

export class AttentionPanelDto {
  @ApiProperty({ example: 3, description: "Number of pending payments awaiting review" })
  paymentsWaiting!: number;

  @ApiProperty({ example: 0, description: "Duplicate payment transaction references detected" })
  duplicateReferences!: number;

  @ApiProperty({ example: 0, description: "Number of failed OCR scan jobs" })
  scanJobsFailed!: number;

  @ApiProperty({ example: 4, description: "Number of courses or materials in draft status" })
  contentInDraft!: number;
}

export class AuditEntryDto {
  @ApiProperty({ example: "audit-uuid-1", description: "Unique audit log ID" })
  id!: string;

  @ApiProperty({ example: "2026-10-17T18:00:00.000Z", description: "ISO timestamp of event" })
  at!: string;

  @ApiProperty({ example: "ADMIN", description: "Actor who performed the action" })
  actor!: "ADMIN" | "STUDENT" | "SYSTEM";

  @ApiProperty({ example: "PAYMENT_APPROVED", description: "Audit action type" })
  action!: string;

  @ApiProperty({ example: "Order ORD-0012", description: "Target entity description" })
  target!: string;

  @ApiProperty({ example: "Verified bank slip with CBE mobile", required: false })
  reason?: string;
}

export class DashboardSummaryDto {
  @ApiProperty({ example: 350, description: "Total count of active enrolled students" })
  activeStudents!: number;

  @ApiProperty({ example: 8, description: "Count of pending payment receipts waiting for review" })
  pendingPayments!: number;

  @ApiProperty({ example: 420, description: "Count of currently active student course entitlements" })
  activeEntitlements!: number;

  @ApiProperty({ example: 15, description: "Count of entitlements expiring in the next 7 days" })
  expiringSoon!: number;

  @ApiProperty({ type: [DailyStudentCountDto], description: "Trend of new student registrations over the last 7 days" })
  newStudents!: DailyStudentCountDto[];

  @ApiProperty({ type: AttentionPanelDto, description: "Items requiring administrative attention" })
  attention!: AttentionPanelDto;

  @ApiProperty({ type: [AuditEntryDto], description: "Most recent administrative activities" })
  recentActivity!: AuditEntryDto[];
}
