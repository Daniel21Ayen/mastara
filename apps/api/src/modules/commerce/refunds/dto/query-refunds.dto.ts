import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { RefundStatus } from "@mastara/database";

export class QueryRefundsDto {
  @ApiPropertyOptional({
    enum: ["REQUESTED", "APPROVED", "REJECTED", "PAID_OUT", "ENTITLEMENT_REVOKED"],
    description: "Filter by refund status",
  })
  @IsOptional()
  @IsIn(["REQUESTED", "APPROVED", "REJECTED", "PAID_OUT", "ENTITLEMENT_REVOKED"])
  status?: RefundStatus;

  @ApiPropertyOptional({
    description: "Search text across student name, reference, order ID, or reason",
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: "Page number" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: "Items per page" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}
