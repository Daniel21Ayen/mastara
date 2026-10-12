import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { ProductType } from "@mastara/database";

export class QuoteOrderDto {
  @ApiProperty({
    enum: ProductType,
    example: ProductType.BUNDLE,
    description: "Product type to quote: BUNDLE, SINGLE, FULL_STREAM, or FULL_BOTH",
  })
  @IsEnum(ProductType, {
    message: "type must be BUNDLE, SINGLE, FULL_STREAM, or FULL_BOTH",
  })
  type!: ProductType;

  @ApiPropertyOptional({
    description: "Number of courses selected (required when type is BUNDLE)",
    example: 8,
  })
  @IsOptional()
  @IsInt({ message: "courseCount must be an integer" })
  @Min(1, { message: "courseCount must be at least 1" })
  courseCount?: number;
}
