import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

export class RecordProgressDto {
  @ApiPropertyOptional({
    example: 0.75,
    description: "Reading scroll position progress between 0.0 and 1.0 (or offset)",
  })
  @IsOptional()
  @IsNumber({}, { message: "scrollPosition must be a number" })
  @Min(0, { message: "scrollPosition cannot be negative" })
  scrollPosition?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Whether the topic reading has been completed",
  })
  @IsOptional()
  @IsBoolean({ message: "isCompleted must be a boolean" })
  isCompleted?: boolean;
}
