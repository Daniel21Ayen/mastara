import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class AdminUniversityDto {
  @ApiProperty({ example: "uni-uuid-1" })
  id!: string;

  @ApiProperty({ example: "Addis Ababa University" })
  name!: string;

  @ApiProperty({ example: "AAU" })
  shortName!: string;

  @ApiPropertyOptional({ example: "https://assets.mastara.edu.et/aau.png" })
  logoUrl?: string;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  status!: "DRAFT" | "PUBLISHED";

  @ApiProperty({ example: 4 })
  programCount!: number;
}

export class AdminProgramDto {
  @ApiProperty({ example: "prog-uuid-1" })
  id!: string;

  @ApiProperty({ example: "uni-uuid-1" })
  universityId!: string;

  @ApiProperty({ example: "AAU" })
  universityShortName!: string;

  @ApiProperty({ example: "Pre-Engineering" })
  name!: string;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  status!: "DRAFT" | "PUBLISHED";

  @ApiProperty({ example: 12 })
  courseCount!: number;
}

export class AdminSemesterDto {
  @ApiProperty({ example: "sem-uuid-1" })
  id!: string;

  @ApiProperty({ example: "prog-uuid-1" })
  programId!: string;

  @ApiProperty({ example: "Pre-Engineering" })
  programName!: string;

  @ApiProperty({ example: "AAU" })
  universityShortName!: string;

  @ApiProperty({ enum: [1, 2], example: 1 })
  number!: 1 | 2;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  status!: "DRAFT" | "PUBLISHED";

  @ApiProperty({ example: 6 })
  courseCount!: number;

  @ApiProperty({ example: 6 })
  publishedCourseCount!: number;
}

export class AdminCourseDto {
  @ApiProperty({ example: "course-uuid-1" })
  id!: string;

  @ApiProperty({ example: "sem-uuid-1" })
  semesterId!: string;

  @ApiPropertyOptional({ example: "prog-uuid-1", nullable: true })
  programId!: string | null;

  @ApiPropertyOptional({ example: "Pre-Engineering", nullable: true })
  programName!: string | null;

  @ApiProperty({ example: "uni-uuid-1" })
  universityId!: string;

  @ApiProperty({ example: "AAU" })
  universityShortName!: string;

  @ApiProperty({ enum: [1, 2], example: 1 })
  semesterNumber!: 1 | 2;

  @ApiProperty({ example: "MATH101" })
  code!: string;

  @ApiProperty({ example: "Applied Mathematics I" })
  title!: string;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL", "COMMON"], example: "NATURAL" })
  stream!: "NATURAL" | "SOCIAL" | "COMMON";

  @ApiProperty({ example: true })
  promotional!: boolean;

  @ApiProperty({ example: 3 })
  freeTrialItems!: number;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  status!: "DRAFT" | "PUBLISHED";
}

import { PaginationQueryDto, PaginatedResult } from "../../../common/pagination";

export class CourseListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search by course code or title" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: "Filter by university ID or ALL" })
  @IsOptional()
  @IsString()
  universityId?: string;

  @ApiPropertyOptional({ description: "Filter by program ID" })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional({ enum: [1, 2], description: "Filter by semester number" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semesterNumber?: 1 | 2;

  @ApiPropertyOptional({ enum: ["NATURAL", "SOCIAL", "COMMON"] })
  @IsOptional()
  @IsEnum(["NATURAL", "SOCIAL", "COMMON"])
  stream?: "NATURAL" | "SOCIAL" | "COMMON";

  @ApiPropertyOptional({ enum: ["DRAFT", "PUBLISHED"] })
  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED"])
  status?: "DRAFT" | "PUBLISHED";
}

export class CourseListResultDto implements PaginatedResult<AdminCourseDto> {
  @ApiProperty({ type: [AdminCourseDto] })
  items!: AdminCourseDto[];

  @ApiProperty({ example: 28 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: 3 })
  pageCount!: number;
}

export class CreateCourseDto {
  @ApiProperty({ example: "uni-uuid-1" })
  @IsString()
  @IsNotEmpty()
  universityId!: string;

  @ApiPropertyOptional({ example: "sem-uuid-1" })
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiPropertyOptional({ enum: [1, 2], example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semesterNumber?: 1 | 2;

  @ApiProperty({ example: "MATH101" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "Applied Mathematics I", minLength: 3 })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL", "COMMON"], example: "NATURAL" })
  @IsEnum(["NATURAL", "SOCIAL", "COMMON"])
  stream!: "NATURAL" | "SOCIAL" | "COMMON";

  @ApiProperty({ example: 3, minimum: 0, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  freeTrialItems!: number;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  @IsEnum(["DRAFT", "PUBLISHED"])
  status!: "DRAFT" | "PUBLISHED";
}

export class UpdateCourseDto {
  @ApiProperty({ example: "MATH101" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "Applied Mathematics I", minLength: 3 })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL", "COMMON"], example: "NATURAL" })
  @IsEnum(["NATURAL", "SOCIAL", "COMMON"])
  stream!: "NATURAL" | "SOCIAL" | "COMMON";

  @ApiProperty({ example: 3, minimum: 0, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  freeTrialItems!: number;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  @IsEnum(["DRAFT", "PUBLISHED"])
  status!: "DRAFT" | "PUBLISHED";

  @ApiPropertyOptional({ example: "Content revision required", minLength: 5 })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UniversityInputDto {
  @ApiProperty({ example: "Addis Ababa University", minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "AAU", minLength: 2, maxLength: 12 })
  @IsString()
  @MinLength(2)
  shortName!: string;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  @IsEnum(["DRAFT", "PUBLISHED"])
  status!: "DRAFT" | "PUBLISHED";

  @ApiPropertyOptional({ example: "Temporarily deactivating for curriculum update", minLength: 5 })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProgramInputDto {
  @ApiProperty({ example: "uni-uuid-1" })
  @IsString()
  @IsNotEmpty()
  universityId!: string;

  @ApiProperty({ example: "Pre-Engineering", minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  @IsEnum(["DRAFT", "PUBLISHED"])
  status!: "DRAFT" | "PUBLISHED";

  @ApiPropertyOptional({ example: "Department restructure", minLength: 5 })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SemesterStatusDto {
  @ApiProperty({ enum: ["DRAFT", "PUBLISHED"], example: "PUBLISHED" })
  @IsEnum(["DRAFT", "PUBLISHED"])
  status!: "DRAFT" | "PUBLISHED";

  @ApiPropertyOptional({ example: "Updating curriculum before semester starts", minLength: 5 })
  @IsOptional()
  @IsString()
  reason?: string;
}
