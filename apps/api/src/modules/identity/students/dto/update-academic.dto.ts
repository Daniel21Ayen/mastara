import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, Matches } from "class-validator";
import { Stream } from "@mastara/database";

export const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export enum StudentStreamSelection {
  NATURAL = "NATURAL",
  SOCIAL = "SOCIAL",
}

export class UpdateAcademicScopeDto {
  @ApiProperty({
    example: "b1010000-0000-0000-0000-000000000001",
    description: "Selected University UUID",
  })
  @IsNotEmpty({ message: "universityId is required" })
  @Matches(UUID_REGEX, { message: "universityId must be a valid UUID" })
  universityId!: string;

  @ApiProperty({
    example: "b2010000-0000-0000-0000-000000000001",
    description: "Selected Program / Department UUID",
  })
  @IsNotEmpty({ message: "programId is required" })
  @Matches(UUID_REGEX, { message: "programId must be a valid UUID" })
  programId!: string;

  @ApiProperty({
    example: "b3010000-0000-0000-0000-000000000001",
    description: "Selected Semester UUID",
  })
  @IsNotEmpty({ message: "semesterId is required" })
  @Matches(UUID_REGEX, { message: "semesterId must be a valid UUID" })
  semesterId!: string;

  @ApiProperty({
    enum: StudentStreamSelection,
    example: StudentStreamSelection.NATURAL,
    description: "Student academic stream (NATURAL or SOCIAL)",
  })
  @IsNotEmpty({ message: "stream is required" })
  @IsEnum(StudentStreamSelection, {
    message: "stream must be either NATURAL or SOCIAL",
  })
  stream!: Stream;
}
