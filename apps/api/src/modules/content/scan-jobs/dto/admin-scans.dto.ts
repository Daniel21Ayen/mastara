import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { SCAN_KINDS, STREAMS } from "@mastara/domain";
import type { ScanKind, Stream } from "@mastara/domain";

export class ScanListQueryDto {
  @ApiPropertyOptional({ enum: SCAN_KINDS, description: "Filter by scan kind" })
  @IsOptional()
  @IsEnum(SCAN_KINDS)
  kind?: ScanKind;

  @ApiPropertyOptional({ description: "Search query across titles, codes, institutions" })
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

export class ListScanCoursesQueryDto {
  @ApiProperty({ description: "Program UUID or identifier" })
  @IsString()
  programId!: string;

  @ApiProperty({ enum: [1, 2], description: "Semester number (1 or 2)" })
  @Type(() => Number)
  @IsInt()
  semesterNumber!: 1 | 2;

  @ApiProperty({ enum: STREAMS, description: "Academic stream" })
  @IsEnum(STREAMS)
  stream!: Stream;
}
