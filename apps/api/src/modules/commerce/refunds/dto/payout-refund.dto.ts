import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class PayoutRefundDto {
  @ApiProperty({
    example: "TELEBIRR-REF-441290",
    description: "External payout transaction reference",
  })
  @IsString()
  @IsNotEmpty()
  payoutReference!: string;

  @ApiPropertyOptional({
    example: "2026-10-26T14:30:00.000Z",
    description: "Optional ISO timestamp when payout was sent outside the platform",
  })
  @IsDateString()
  @IsOptional()
  paidOutAt?: string;
}
