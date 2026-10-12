import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsUUID } from "class-validator";
import { Stream } from "@mastara/database";

export class GetBuyableCoursesQueryDto {
  @ApiProperty({
    description: "UUID of the academic semester",
    example: "b3010000-0000-4000-8000-000000000001",
  })
  @IsUUID("all", { message: "semesterId must be a valid UUID" })
  semesterId!: string;

  @ApiProperty({
    enum: Stream,
    example: Stream.NATURAL,
    description: "Student academic stream (NATURAL or SOCIAL)",
  })
  @IsEnum(Stream, { message: "stream must be NATURAL or SOCIAL" })
  stream!: Stream;
}
