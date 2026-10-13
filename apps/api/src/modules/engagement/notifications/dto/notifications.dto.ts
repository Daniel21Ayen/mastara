import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by read status — omit for all",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description: "Maximum number of notifications to return (default 30, max 100)",
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}
