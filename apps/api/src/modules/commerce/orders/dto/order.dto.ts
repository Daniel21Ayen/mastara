import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";
import { OrderStatus, PaymentMethod, ProductType, Stream } from "@mastara/database";

export class CreateOrderDto {
  @ApiProperty({
    enum: ProductType,
    example: ProductType.BUNDLE,
    description: "Product type: SINGLE, BUNDLE, FULL_STREAM, or FULL_BOTH",
  })
  @IsEnum(ProductType, { message: "type must be a valid ProductType" })
  type!: ProductType;

  @ApiProperty({
    enum: Stream,
    example: Stream.NATURAL,
    description: "Stream the order applies to (NATURAL or SOCIAL)",
  })
  @IsEnum(Stream, { message: "stream must be NATURAL or SOCIAL" })
  stream!: Stream;

  @ApiPropertyOptional({
    description: "Program ID (required for FULL_STREAM / FULL_BOTH orders)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID("4", { message: "programId must be a valid UUID" })
  programId?: string;

  @ApiProperty({
    description: "Array of course UUIDs included in this order",
    example: ["550e8400-e29b-41d4-a716-446655440000"],
    type: [String],
  })
  @IsArray({ message: "courseIds must be an array" })
  @IsUUID("4", { each: true, message: "each courseId must be a valid UUID" })
  courseIds!: string[];

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CBE_MOBILE,
    description: "Ethiopian payment method used: CBE_MOBILE, CBE_BIRR, or TELEBIRR",
  })
  @IsEnum(PaymentMethod, { message: "method must be a valid PaymentMethod" })
  method!: PaymentMethod;

  @ApiProperty({
    description: "Transaction reference from the payment app (CBE starts with FT)",
    example: "FT24ABC123456",
  })
  @IsString({ message: "reference must be a string" })
  @MinLength(6, { message: "reference must be at least 6 characters" })
  reference!: string;
}

export class GetOrdersQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: "Filter orders by status",
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: "status must be a valid OrderStatus" })
  status?: OrderStatus;
}

export class SubmitOrderWithLocalDto {
  @ApiProperty({ description: "Temporary local account UUID", example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsUUID("4", { message: "localAccountId must be a valid UUID" })
  localAccountId!: string;

  @ApiProperty({ description: "Student's full name", example: "Abebe Bikila" })
  @IsString()
  @MinLength(2, { message: "fullName must be at least 2 characters" })
  fullName!: string;

  @ApiProperty({ description: "Student's Ethiopian phone number or email", example: "0911223344" })
  @IsString()
  @MinLength(3, { message: "identifier must be at least 3 characters" })
  identifier!: string;

  @ApiProperty({ description: "Student's account password (for post-approval recovery login)", example: "Password123!" })
  @IsString()
  @MinLength(6, { message: "password must be at least 6 characters" })
  password!: string;

  @ApiProperty({ description: "SHA-256 hash of the client-generated claim secret (64 hex characters)", example: "33e29618af5c636e782cfadefb698192ef7b2d8e5567d3c8cf560f61697cc6f5" })
  @IsString()
  @MinLength(64)
  claimSecretHash!: string;

  @ApiProperty({ enum: ProductType, example: ProductType.BUNDLE })
  @IsEnum(ProductType, { message: "type must be a valid ProductType" })
  type!: ProductType;

  @ApiProperty({ enum: Stream, example: Stream.NATURAL })
  @IsEnum(Stream, { message: "stream must be NATURAL or SOCIAL" })
  stream!: Stream;

  @ApiPropertyOptional({ description: "Program ID" })
  @IsOptional()
  @IsUUID("4")
  programId?: string;

  @ApiProperty({ type: [String], description: "Course IDs included in this order" })
  @IsArray()
  @IsUUID("4", { each: true })
  courseIds!: string[];

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CBE_MOBILE })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: "FT24ABC123456" })
  @IsString()
  @MinLength(6)
  reference!: string;

  @ApiProperty({ description: "Uploaded receipt image key", example: "receipts/order-1.jpg" })
  @IsString()
  imageKey!: string;

  @ApiProperty({ description: "Receipt image size in bytes", example: 1048576 })
  imageSizeBytes!: number;

  @ApiProperty({ description: "Receipt image MIME type", example: "image/jpeg" })
  @IsString()
  imageMime!: string;
}

export class ClaimOrderDto {
  @ApiProperty({ description: "Raw 64-character hex claim secret known only to the phone", example: "a".repeat(64) })
  @IsString()
  @MinLength(64)
  claimSecret!: string;
}

export class PaymentSettingsDto {
  @ApiProperty({ description: "Toggle whether students can purchase single courses", example: true })
  singleCoursesEnabled!: boolean;

  @ApiPropertyOptional({ description: "Bundle pricing overrides" })
  bundlePrices?: Record<string, number>;

  @ApiPropertyOptional({ description: "Single-course pricing overrides" })
  singleCoursePrices?: Record<string, number>;
}

