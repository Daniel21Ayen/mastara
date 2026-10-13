import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsUUID } from "class-validator";
import { Stream } from "@mastara/database";

export class GetFullPackageQueryDto {
  @ApiProperty({
    description: "UUID of the academic program",
    example: "b2010000-0000-4000-8000-000000000001",
  })
  @IsUUID("all", { message: "programId must be a valid UUID" })
  programId!: string;

  @ApiProperty({
    enum: Stream,
    example: Stream.NATURAL,
    description: "Stream filter for full package courses",
  })
  @IsEnum(Stream, { message: "stream must be NATURAL or SOCIAL" })
  stream!: Stream;
}
