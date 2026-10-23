import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { PaymentMethod } from "@mastara/database";

export class AdminPaymentCourseDto {
  @ApiProperty({ example: "c-uuid-1" })
  courseId!: string;

  @ApiProperty({ example: "MATH101" })
  code!: string;

  @ApiProperty({ example: "Applied Mathematics I" })
  title!: string;
}

export class AdminPaymentDto {
  @ApiProperty({ example: "proof-uuid-1", description: "Unique payment proof or order ID" })
  id!: string;

  @ApiProperty({ example: "student-uuid-1", description: "UUID of the student" })
  studentId!: string;

  @ApiProperty({ example: "Abebe Kebede", description: "Student full name" })
  studentName!: string;

  @ApiProperty({ example: "AAU", description: "University code/short name" })
  universityShortName!: string;

  @ApiProperty({ enum: ["BUNDLE", "SINGLE", "FULL_STREAM", "FULL_BOTH"], example: "BUNDLE" })
  type!: "BUNDLE" | "SINGLE" | "FULL_STREAM" | "FULL_BOTH";

  @ApiProperty({ enum: ["NATURAL", "SOCIAL", "BOTH"], example: "NATURAL" })
  stream!: "NATURAL" | "SOCIAL" | "BOTH";

  @ApiProperty({ type: [AdminPaymentCourseDto] })
  courses!: AdminPaymentCourseDto[];

  @ApiProperty({ example: 450, description: "Quoted price in ETB" })
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CBE_MOBILE })
  method!: "CBE_MOBILE" | "CBE_BIRR" | "TELEBIRR";

  @ApiProperty({ example: "FT24ABC123456", description: "Transaction reference string" })
  reference!: string;

  @ApiProperty({ enum: ["PENDING", "APPROVED", "REJECTED"], example: "PENDING" })
  status!: "PENDING" | "APPROVED" | "REJECTED";

  @ApiPropertyOptional({
    enum: ["MISMATCH", "UNREADABLE", "DUPLICATE"],
    example: "MISMATCH",
    nullable: true,
  })
  rejectReason!: "MISMATCH" | "UNREADABLE" | "DUPLICATE" | null;

  @ApiProperty({ example: "2026-10-17T12:00:00.000Z" })
  createdAt!: string;

  @ApiPropertyOptional({ example: "2026-10-17T14:30:00.000Z", nullable: true })
  decidedAt!: string | null;

  @ApiProperty({ example: 120, description: "Duration in days of entitlement" })
  durationDays!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  duplicateOf!: string | null;

  @ApiPropertyOptional({ example: "receipts/order-cbe-98765-1792613647293.jpg", nullable: true })
  @IsOptional()
  @IsString()
  imageKey?: string | null;

  @ApiPropertyOptional({ example: "/api/v1/storage/file?key=receipts%2Forder-cbe-98765-1792613647293.jpg", nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: "image/jpeg", nullable: true })
  @IsOptional()
  @IsString()
  imageMime?: string | null;

  @ApiPropertyOptional({ example: 54321, nullable: true })
  @IsOptional()
  imageSizeBytes?: number | null;
}

export class PaymentCountsDto {
  @ApiProperty({ example: 5, description: "Total payments waiting for review" })
  pending!: number;

  @ApiProperty({ example: 38, description: "Total payments approved" })
  approved!: number;

  @ApiProperty({ example: 4, description: "Total payments rejected" })
  rejected!: number;
}

export class PaymentListQueryDto {
  @ApiPropertyOptional({
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING",
    description: "Filter by order status",
  })
  @IsOptional()
  @IsEnum(["PENDING", "APPROVED", "REJECTED"])
  status?: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: "Filter by payment method",
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: "Search by student name, ID, or transaction reference" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: "Page number" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export class PaymentListResultDto {
  @ApiProperty({ type: [AdminPaymentDto] })
  items!: AdminPaymentDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 2 })
  pageCount!: number;

  @ApiProperty({ type: PaymentCountsDto })
  counts!: PaymentCountsDto;
}

export class PaymentDecisionDto {
  @ApiProperty({ enum: ["APPROVE", "REJECT"], example: "APPROVE" })
  @IsEnum(["APPROVE", "REJECT"])
  action!: "APPROVE" | "REJECT";

  @ApiPropertyOptional({
    enum: ["MISMATCH", "UNREADABLE", "DUPLICATE"],
    example: "MISMATCH",
    description: "Required when action is REJECT",
  })
  @IsOptional()
  @IsEnum(["MISMATCH", "UNREADABLE", "DUPLICATE"])
  reason?: "MISMATCH" | "UNREADABLE" | "DUPLICATE";
}
