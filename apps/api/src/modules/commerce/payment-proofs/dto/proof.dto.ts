import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString, MaxLength, MinLength } from "class-validator";
import { PaymentMethod } from "@mastara/database";

export class SubmitProofDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CBE_MOBILE,
    description: "Payment method used: CBE_MOBILE, CBE_BIRR, or TELEBIRR",
  })
  @IsEnum(PaymentMethod, { message: "method must be a valid PaymentMethod" })
  method!: PaymentMethod;

  @ApiProperty({
    description: "Bank/app transaction reference (CBE Mobile starts with FT)",
    example: "FT24ABC123456",
  })
  @IsString()
  @MinLength(6, { message: "reference must be at least 6 characters" })
  @MaxLength(30, { message: "reference must be at most 30 characters" })
  transactionReference!: string;

  @ApiProperty({
    description: "Storage key (path) of the uploaded receipt image",
    example: "receipts/2024/student-id/receipt.jpg",
  })
  @IsString({ message: "imageKey must be a string" })
  @MinLength(5, { message: "imageKey must be at least 5 characters" })
  imageKey!: string;

  @ApiProperty({
    description: "MIME type of the receipt image",
    example: "image/jpeg",
  })
  @IsString()
  imageMime!: string;

  @ApiProperty({
    description: "Size of the receipt image in bytes",
    example: 204800,
  })
  @IsNumber({}, { message: "imageSizeBytes must be a number" })
  imageSizeBytes!: number;
}

export class ReviewProofDto {
  @ApiProperty({
    enum: ["APPROVED", "REJECTED"],
    example: "APPROVED",
    description: "Approval decision for the payment proof",
  })
  @IsEnum(["APPROVED", "REJECTED"], { message: "decision must be APPROVED or REJECTED" })
  decision!: "APPROVED" | "REJECTED";

  @ApiPropertyOptional({
    description: "Required when decision is REJECTED",
    example: "MISMATCH",
  })
  @IsString()
  @IsEnum(["MISMATCH", "UNREADABLE", "DUPLICATE"], {
    message: "rejectReason must be MISMATCH, UNREADABLE, or DUPLICATE",
  })
  rejectReason?: string;
}
