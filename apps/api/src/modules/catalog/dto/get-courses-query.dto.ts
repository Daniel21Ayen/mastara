import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, Matches } from "class-validator";
import { Stream } from "@mastara/database";

export const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class GetCoursesQueryDto {
  @ApiProperty({
    example: "b3010000-0000-0000-0000-000000000001",
    description: "UUID of the academic semester",
  })
  @IsNotEmpty()
  @Matches(UUID_REGEX, { message: "semesterId must be a valid UUID" })
  semesterId!: string;

  @ApiPropertyOptional({
    enum: Stream,
    example: Stream.NATURAL,
    description: "Optional student academic stream filter (returns matching stream and COMMON courses)",
  })
  @IsOptional()
  @IsEnum(Stream, { message: "stream must be NATURAL, SOCIAL, or COMMON" })
  stream?: Stream;
}
