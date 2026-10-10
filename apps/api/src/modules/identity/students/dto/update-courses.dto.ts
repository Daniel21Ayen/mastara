import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, Matches } from "class-validator";
import { UUID_REGEX } from "./update-academic.dto";

export class UpdateCoursesDto {
  @ApiProperty({
    example: ["c1010000-0000-0000-0000-000000000001", "c1010000-0000-0000-0000-000000000002"],
    description: "Array of selected Course UUIDs",
  })
  @IsArray({ message: "courseIds must be an array" })
  @ArrayNotEmpty({ message: "At least one course must be selected" })
  @Matches(UUID_REGEX, { each: true, message: "Each courseId must be a valid UUID" })
  courseIds!: string[];
}
