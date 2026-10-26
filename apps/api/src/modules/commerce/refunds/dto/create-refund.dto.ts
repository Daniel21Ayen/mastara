import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MinLength } from "class-validator";

export class CreateRefundDto {
  @ApiProperty({
    example: "9a21b365-1d42-4f32-8419-5ebbb873c331",
    description: "UUID of the approved order to refund",
  })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({
    example: "Student requested cancellation due to university transfer",
    description: "Operational reason for requesting the refund",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason!: string;
}
