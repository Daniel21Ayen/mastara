import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by read status — omit for all",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description: "Maximum number of notifications to return (default 30, max 100)",
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}

export class RegisterPushTokenDto {
  @ApiPropertyOptional({
    description: "Expo push token or Firebase FCM device token",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsOptional()
  @IsString()
  token!: string;

  @ApiPropertyOptional({
    description: "Device platform",
    example: "android",
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: "Hardware device ID hash",
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SendBroadcastDto {
  @ApiProperty({
    description: "Broadcast announcement title",
    example: "2026 Model COC Exam Sets Released",
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: "Broadcast announcement body",
    example: "Comprehensive Model COC exams for Natural and Social sciences are now unlocked in the Exams section.",
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiProperty({
    description: "Target audience (ALL, NATURAL_SCIENCE, SOCIAL_SCIENCE, or university code)",
    example: "ALL",
  })
  @IsString()
  @IsNotEmpty()
  audience!: string;

  @ApiProperty({
    description: "Broadcast priority (INFO, EXAM, URGENT, MAINTENANCE)",
    example: "INFO",
  })
  @IsString()
  @IsNotEmpty()
  priority!: string;

  @ApiPropertyOptional({
    description: "Optional destination URL or route",
    example: "/exam/coc",
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}

