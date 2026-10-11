import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MinLength } from "class-validator";
import { IDENTIFIER_REGEX } from "../../auth/dto/register.dto";

export class EditAccountDto {
  @ApiPropertyOptional({
    example: "Abebe Kebede",
    description: "Updated full name of the student",
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  name?: string;

  @ApiPropertyOptional({
    example: "+251911223344",
    description: "Updated Ethiopian phone number or email address",
  })
  @IsOptional()
  @IsString()
  @Matches(IDENTIFIER_REGEX, {
    message: "Identifier must be a valid Ethiopian phone number or email address",
  })
  identifier?: string;
}
