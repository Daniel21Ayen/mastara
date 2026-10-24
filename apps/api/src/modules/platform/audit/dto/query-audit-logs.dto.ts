import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../../../common/pagination";

export class QueryAuditLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["ALL", "ADMIN", "STUDENT", "SYSTEM"] })
  @IsOptional()
  @IsIn(["ALL", "ADMIN", "STUDENT", "SYSTEM"])
  actor?: "ALL" | "ADMIN" | "STUDENT" | "SYSTEM";

  @ApiPropertyOptional({
    enum: ["ALL", "PAYMENTS", "SECURITY", "CONTENT", "COMMERCE", "STUDENT"],
  })
  @IsOptional()
  @IsIn(["ALL", "PAYMENTS", "SECURITY", "CONTENT", "COMMERCE", "STUDENT"])
  actionGroup?: "ALL" | "PAYMENTS" | "SECURITY" | "CONTENT" | "COMMERCE" | "STUDENT";

  @ApiPropertyOptional({ enum: ["ALL", "TODAY", "WEEK", "MONTH"] })
  @IsOptional()
  @IsIn(["ALL", "TODAY", "WEEK", "MONTH"])
  range?: "ALL" | "TODAY" | "WEEK" | "MONTH";

  @ApiPropertyOptional({ description: "Search query string" })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
