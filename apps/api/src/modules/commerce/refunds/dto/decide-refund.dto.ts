import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DecideRefundDto {
  @ApiProperty({
    enum: ["APPROVE", "REJECT"],
    example: "APPROVE",
    description: "Decision action by Super Admin",
  })
  @IsIn(["APPROVE", "REJECT"])
  @IsNotEmpty()
  action!: "APPROVE" | "REJECT";

  @ApiPropertyOptional({
    example: "Verified bank receipt and approved per policy",
    description: "Reason or justification for approval or rejection",
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    example: "CBE-REV-2026-9901",
    description: "Manual bank payout transaction reference",
  })
  @IsString()
  @IsOptional()
  payoutReference?: string;
}
