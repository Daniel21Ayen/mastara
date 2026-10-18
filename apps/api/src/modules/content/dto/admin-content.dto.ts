import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CatalogStatus } from "@mastara/domain";

export class BilingualTextDto {
  @ApiProperty({ description: "English text content" })
  @IsString()
  en!: string;

  @ApiProperty({ description: "Amharic text content" })
  @IsString()
  am!: string;
}

export class AdminModuleInputDto {
  @ApiProperty({ description: "UUID of the course" })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ type: BilingualTextDto, description: "Bilingual module title" })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  title!: BilingualTextDto;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Publication status" })
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status!: CatalogStatus;

  @ApiPropertyOptional({ description: "Reason for state change (required if unpublishing)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminTopicInputDto {
  @ApiProperty({ description: "UUID of the module" })
  @IsString()
  @IsNotEmpty()
  moduleId!: string;

  @ApiProperty({ type: BilingualTextDto, description: "Bilingual topic title" })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  title!: BilingualTextDto;
}

export class AdminNoteInputDto {
  @ApiProperty({ description: "UUID of the course" })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ description: "UUID of the parent module" })
  @IsString()
  @IsNotEmpty()
  moduleId!: string;

  @ApiProperty({ type: BilingualTextDto, description: "Bilingual note title" })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  title!: BilingualTextDto;

  @ApiProperty({ type: BilingualTextDto, description: "Bilingual note markdown/math body" })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  body!: BilingualTextDto;

  @ApiProperty({ description: "Free trial flag allowing unpaid preview" })
  @IsBoolean()
  isFree!: boolean;

  @ApiProperty({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], description: "Publication status" })
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status!: CatalogStatus;

  @ApiPropertyOptional({ description: "Reason for state change (required if unpublishing)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminAmharicNoteInputDto {
  @ApiProperty({ description: "Amharic note title" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: "Amharic note markdown/math body" })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
