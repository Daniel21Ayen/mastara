import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { IDENTIFIER_REGEX } from "./register.dto";

export class LoginDto {
  @ApiProperty({
    example: "+251911223344",
    description: "Ethiopian phone number or email address",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(IDENTIFIER_REGEX, {
    message: "Identifier must be a valid Ethiopian phone number (+2519... / 09...) or email address",
  })
  identifier!: string;

  @ApiProperty({
    example: "SecurePassword2026!",
    description: "Account password (minimum 6 characters)",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  totp_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class AdminLoginDto extends LoginDto {}

