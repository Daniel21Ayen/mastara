import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RefundStatus } from "@mastara/database";

export class AdminRefundDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  studentName!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ["REQUESTED", "APPROVED", "REJECTED", "PAID_OUT", "ENTITLEMENT_REVOKED"] })
  status!: RefundStatus;

  @ApiProperty()
  requestedBy!: string;

  @ApiPropertyOptional()
  reviewedBy?: string | null;

  @ApiPropertyOptional()
  decisionReason?: string | null;

  @ApiPropertyOptional()
  payoutReference?: string | null;

  @ApiPropertyOptional()
  paidOutAt?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class RefundListResultDto {
  @ApiProperty({ type: [AdminRefundDto] })
  items!: AdminRefundDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalPages!: number;
}
