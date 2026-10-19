import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
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

export class AdminStudentSummaryDto {
  @ApiProperty({ example: "student-uuid-1" })
  id!: string;

  @ApiProperty({ example: "Abebe Kebede" })
  name!: string;

  @ApiProperty({ example: "+251911223344" })
  identifier!: string;

  @ApiProperty({ example: "uni-uuid-1" })
  universityId!: string;

  @ApiProperty({ example: "AAU" })
  universityShortName!: string;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL"], example: "NATURAL" })
  stream!: "NATURAL" | "SOCIAL";

  @ApiProperty({ example: 6 })
  courseCount!: number;

  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED"], example: "ACTIVE" })
  status!: "ACTIVE" | "SUSPENDED";

  @ApiProperty({ enum: ["BOUND", "RELEASED"], example: "BOUND" })
  device!: "BOUND" | "RELEASED";

  @ApiProperty({ enum: ["PAID", "PENDING", "FREE_TRIAL", "EXPIRED"], example: "PAID" })
  access!: "PAID" | "PENDING" | "FREE_TRIAL" | "EXPIRED";
}

export class AdminStudentCourseDto {
  @ApiProperty({ example: "course-uuid-1" })
  courseId!: string;

  @ApiProperty({ example: "MATH101" })
  code!: string;

  @ApiProperty({ example: "Applied Mathematics I" })
  title!: string;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL", "COMMON"], example: "NATURAL" })
  stream!: "NATURAL" | "SOCIAL" | "COMMON";

  @ApiProperty({ enum: ["PAID", "PENDING", "FREE_TRIAL", "EXPIRED"], example: "PAID" })
  access!: "PAID" | "PENDING" | "FREE_TRIAL" | "EXPIRED";

  @ApiPropertyOptional({ example: "2026-11-18T10:00:00.000Z" })
  expiresAt?: string;
}

export class AdminStudentDetailDto extends AdminStudentSummaryDto {
  @ApiProperty({ example: "Pre-Engineering" })
  programName!: string;

  @ApiProperty({ enum: [1, 2], example: 1 })
  semesterNumber!: 1 | 2;

  @ApiPropertyOptional({ example: "2026-09-01T08:00:00.000Z" })
  boundAt?: string;

  @ApiPropertyOptional({ example: "2026-10-18T15:30:00.000Z" })
  lastSeenAt?: string;

  @ApiProperty({ type: [AdminStudentCourseDto] })
  courses!: AdminStudentCourseDto[];
}

export class StudentListQueryDto {
  @ApiPropertyOptional({ description: "Search by ID, name, phone, or email" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: "Filter by university ID" })
  @IsOptional()
  @IsString()
  universityId?: string;

  @ApiPropertyOptional({ enum: ["NATURAL", "SOCIAL"] })
  @IsOptional()
  @IsEnum(["NATURAL", "SOCIAL"])
  stream?: "NATURAL" | "SOCIAL";

  @ApiPropertyOptional({ enum: ["PAID", "PENDING", "FREE_TRIAL", "EXPIRED"] })
  @IsOptional()
  @IsEnum(["PAID", "PENDING", "FREE_TRIAL", "EXPIRED"])
  access?: "PAID" | "PENDING" | "FREE_TRIAL" | "EXPIRED";

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export class StudentListResultDto {
  @ApiProperty({ type: [AdminStudentSummaryDto] })
  items!: AdminStudentSummaryDto[];

  @ApiProperty({ example: 2458 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 246 })
  pageCount!: number;
}

export class StudentActionDto {
  @ApiProperty({ example: "Requested by university registrar office", minLength: 5 })
  @IsString()
  @MinLength(5)
  reason!: string;
}

export class GrantAccessDto {
  @ApiProperty({ example: "course-uuid-1" })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ example: 30, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;

  @ApiProperty({ example: "Hardship waiver approved by director", minLength: 5 })
  @IsString()
  @MinLength(5)
  reason!: string;
}

export class CreateStudentDto {
  @ApiProperty({ example: "Abebe Kebede", minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "+251911223344 or abebe@example.com" })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ example: "uni-uuid-1" })
  @IsString()
  @IsNotEmpty()
  universityId!: string;

  @ApiProperty({ example: "prog-uuid-1" })
  @IsString()
  @IsNotEmpty()
  programId!: string;

  @ApiProperty({ example: "sem-uuid-1" })
  @IsString()
  @IsNotEmpty()
  semesterId!: string;

  @ApiProperty({ enum: ["NATURAL", "SOCIAL"], example: "NATURAL" })
  @IsEnum(["NATURAL", "SOCIAL"])
  stream!: "NATURAL" | "SOCIAL";
}

export class UniversityOptionDto {
  @ApiProperty({ example: "uni-uuid-1" })
  id!: string;

  @ApiProperty({ example: "Addis Ababa University" })
  name!: string;

  @ApiProperty({ example: "AAU" })
  shortName!: string;
}

export class ProgramOptionDto {
  @ApiProperty({ example: "prog-uuid-1" })
  id!: string;

  @ApiProperty({ example: "uni-uuid-1" })
  universityId!: string;

  @ApiProperty({ example: "Pre-Engineering" })
  name!: string;
}

export class SemesterOptionDto {
  @ApiProperty({ example: "sem-uuid-1" })
  id!: string;

  @ApiProperty({ example: "prog-uuid-1" })
  programId!: string;

  @ApiProperty({ enum: [1, 2], example: 1 })
  number!: 1 | 2;
}

export class StudentOptionsDto {
  @ApiProperty({ type: [UniversityOptionDto] })
  universities!: UniversityOptionDto[];

  @ApiProperty({ type: [ProgramOptionDto] })
  programs!: ProgramOptionDto[];

  @ApiProperty({ type: [SemesterOptionDto] })
  semesters!: SemesterOptionDto[];
}
