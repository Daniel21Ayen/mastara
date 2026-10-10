import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export const IDENTIFIER_REGEX = /^(((\+251|251|0)?9\d{8})|([^\s@]+@[^\s@]+\.[^\s@]+))$/i;

export class RegisterDto {
  @ApiProperty({
    example: "Abebe Kebede",
    description: "Full name of the student (minimum 2 characters)",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name!: string;

  @ApiProperty({
    example: "+251911223344",
    description: "Ethiopian phone number (+2519..., 09..., 9...) or email address",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(IDENTIFIER_REGEX, {
    message: "Identifier must be a valid Ethiopian phone number (+2519... / 09...) or email address",
  })
  identifier!: string;

  @ApiProperty({
    example: "SecurePassword2026!",
    description: "Account password (minimum 8 characters)",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password!: string;
}
