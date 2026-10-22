import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsInt, Min, IsArray, ValidateNested } from "class-validator";
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

export class UploadFileItemDto {
  @ApiProperty({ description: "File name", example: "page-1.jpg" })
  @IsString()
  name!: string;

  @ApiProperty({ description: "MIME type", example: "image/jpeg" })
  @IsString()
  mime!: string;

  @ApiProperty({ description: "File size in bytes", example: 250000 })
  @Type(() => Number)
  @IsInt()
  sizeBytes!: number;
}

export class RequestUploadUrlsDto {
  @ApiProperty({ type: [UploadFileItemDto], description: "List of files to get presigned URLs for" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadFileItemDto)
  files!: UploadFileItemDto[];
}
