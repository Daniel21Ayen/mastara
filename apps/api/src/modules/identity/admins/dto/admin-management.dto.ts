import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AdminRole } from "@mastara/database";

export class AdminScopeInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  university_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  program_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  course_id?: string;
}

export class CreateAdminDto {
  @ApiProperty({ example: "admin@mastara.app" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "StrongPassword2026!" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "Abebe" })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: "Kebede" })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ example: "Abebe Kebede" })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: "+251911223344" })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ enum: AdminRole, default: AdminRole.SUPER_ADMIN })
  @IsEnum(AdminRole)
  admin_role!: AdminRole;

  @ApiPropertyOptional({ type: [AdminScopeInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminScopeInputDto)
  scopes?: AdminScopeInputDto[];
}

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: "admin@mastara.app" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  admin_role?: AdminRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ type: [AdminScopeInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminScopeInputDto)
  scopes?: AdminScopeInputDto[];
}

export class VerifyTotpDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: "JBSWY3DPEHPK3PXP" })
  @IsOptional()
  @IsString()
  secret?: string;
}
