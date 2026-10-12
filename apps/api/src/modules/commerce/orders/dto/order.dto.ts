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
