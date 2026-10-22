import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class StorageUploadResponseDto {
  @ApiProperty({ description: "Unique storage key" })
  key!: string;

  @ApiProperty({ description: "Public or signed access URL" })
  url!: string;

  @ApiProperty({ description: "Size of uploaded file in bytes" })
  sizeBytes!: number;

  @ApiProperty({ description: "MIME type of uploaded file" })
  mimeType!: string;

  @ApiPropertyOptional({ description: "SHA-256 checksum of uploaded content" })
  checksumSha256?: string;
}

export class UploadReceiptDto {
  @ApiPropertyOptional({ description: "Optional Order ID associated with the receipt" })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class UploadDocumentDto {
  @ApiPropertyOptional({ description: "Optional Course ID associated with the document" })
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class UploadScanDto {
  @ApiPropertyOptional({ description: "Optional Scan Job ID associated with the scanned document" })
  @IsOptional()
  @IsString()
  scanJobId?: string;
}

export class GenericUploadDto {
  @ApiPropertyOptional({ description: "Optional destination folder (e.g. receipts, documents, scans, general)" })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class FileKeyQueryDto {
  @ApiProperty({ description: "Storage key of the file" })
  @IsString()
  key!: string;
}
