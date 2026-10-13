import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty } from "class-validator";

export class GetQuizChaptersQueryDto {
  @ApiProperty({
    example: 1,
    description: "Quiz stage number (1, 2, or 3)",
    enum: [1, 2, 3],
  })
  @IsNotEmpty({ message: "quizNo is required" })
  @Type(() => Number)
  @IsInt({ message: "quizNo must be an integer" })
  @IsIn([1, 2, 3], { message: "quizNo must be 1, 2, or 3" })
  quizNo!: number;
}
