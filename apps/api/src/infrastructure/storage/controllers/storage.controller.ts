import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import * as path from "path";
import { Role } from "@mastara/database";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { StorageService } from "../storage.service";
import {
  FileKeyQueryDto,
  GenericUploadDto,
  StorageUploadResponseDto,
  UploadDocumentDto,
  UploadReceiptDto,
  UploadScanDto,
} from "../dto/storage.dto";
import {
  DISALLOWED_EXTENSIONS,
  DOCUMENT_ALLOWED_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_GENERIC_BYTES,
  MAX_RECEIPT_BYTES,
  RECEIPT_ALLOWED_MIME_TYPES,
  sanitizeFilename,
  validateUploadedFile,
} from "../storage-validation";

@ApiTags("Storage & File Uploads")
@ApiBearerAuth()
@Controller("storage")
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload payment proof receipt (students & admins)
   */
  @Post("receipt")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload payment receipt screenshot or image proof",
    description: "Accepts JPG, PNG, WEBP, HEIC images up to 10MB.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Receipt image file",
        },
        orderId: {
          type: "string",
          description: "Optional Order ID associated with the receipt",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Receipt successfully uploaded",
    type: StorageUploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "File missing, invalid MIME type, or file too large",
  })
  async uploadReceipt(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadReceiptDto,
    @CurrentUser() user: any,
  ): Promise<StorageUploadResponseDto> {
    const validated = validateUploadedFile(file, {
      maxBytes: MAX_RECEIPT_BYTES,
      allowedMimes: RECEIPT_ALLOWED_MIME_TYPES,
      disallowedExtensions: DISALLOWED_EXTENSIONS,
    });

    const sanitizedName = sanitizeFilename(validated.originalname);
    const orderId = dto.orderId || (user?.id ? `usr-${user.id}` : "pending");

    this.logger.log(
      `Uploading receipt for order/user [${orderId}], original name: ${validated.originalname} (${validated.size} bytes)`,
    );

    return this.storageService.uploadReceipt(
      orderId,
      sanitizedName,
      validated.buffer,
      validated.mimetype,
    );
  }

  /**
   * Upload course document / lecture PDF (Admins)
   */
  @Post("document")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload course document or lecture PDF (Admin only)",
    description: "Accepts PDF and images up to 50MB.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Document file",
        },
        courseId: {
          type: "string",
          description: "Optional Course ID associated with the document",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Course document successfully uploaded",
    type: StorageUploadResponseDto,
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ): Promise<StorageUploadResponseDto> {
    const validated = validateUploadedFile(file, {
      maxBytes: MAX_DOCUMENT_BYTES,
      allowedMimes: DOCUMENT_ALLOWED_MIME_TYPES,
      disallowedExtensions: DISALLOWED_EXTENSIONS,
    });

    const sanitizedName = sanitizeFilename(validated.originalname);
    const courseId = dto.courseId || "general";

    this.logger.log(
      `Uploading course document for course [${courseId}], filename: ${sanitizedName} (${validated.size} bytes)`,
    );

    return this.storageService.uploadDocument(
      courseId,
      sanitizedName,
      validated.buffer,
      validated.mimetype,
    );
  }

  /**
   * Upload scanned test paper or question image / PDF (Admins)
   */
  @Post("scan")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload scanned test paper or question asset (Admin only)",
    description: "Accepts PDF and images up to 50MB.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Scanned document or page file",
        },
        scanJobId: {
          type: "string",
          description: "Optional Scan Job ID",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Scan asset successfully uploaded",
    type: StorageUploadResponseDto,
  })
  async uploadScan(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadScanDto,
  ): Promise<StorageUploadResponseDto> {
    const validated = validateUploadedFile(file, {
      maxBytes: MAX_DOCUMENT_BYTES,
      allowedMimes: DOCUMENT_ALLOWED_MIME_TYPES,
      disallowedExtensions: DISALLOWED_EXTENSIONS,
    });

    const sanitizedName = sanitizeFilename(validated.originalname);
    const scanJobId = dto.scanJobId || `job-${Date.now()}`;

    this.logger.log(
      `Uploading scan asset for job [${scanJobId}], filename: ${sanitizedName} (${validated.size} bytes)`,
    );

    return this.storageService.uploadScan(
      scanJobId,
      sanitizedName,
      validated.buffer,
      validated.mimetype,
    );
  }

  /**
   * Generic authenticated file upload
   */
  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Generic authenticated file upload",
    description: "Uploads any permitted file asset up to 50MB into a specified folder.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File to upload",
        },
        folder: {
          type: "string",
          description: "Target folder (e.g. general, avatars, attachments)",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "File uploaded successfully",
    type: StorageUploadResponseDto,
  })
  async genericUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: GenericUploadDto,
  ): Promise<StorageUploadResponseDto> {
    const validated = validateUploadedFile(file, {
      maxBytes: MAX_GENERIC_BYTES,
      disallowedExtensions: DISALLOWED_EXTENSIONS,
    });

    const sanitizedName = sanitizeFilename(validated.originalname);
    const folder = dto.folder
      ? dto.folder.replace(/[^a-zA-Z0-9_\-\/]/g, "").replace(/\.\./g, "")
      : "general";
    const key = `${folder}/${Date.now()}-${sanitizedName}`;

    this.logger.log(`Performing generic upload to key: ${key}`);

    return this.storageService.upload(key, validated.buffer, validated.mimetype);
  }

  /**
   * Get accessible URL (signed or public) for an asset key
   */
  @Get("url")
  @ApiOperation({ summary: "Get accessible URL for a storage key" })
  @ApiQuery({ name: "key", description: "Storage key of the file" })
  @ApiResponse({ status: HttpStatus.OK, description: "URL resolved" })
  async getUrl(@Query() query: FileKeyQueryDto): Promise<{ key: string; url: string }> {
    if (!query.key) {
      throw new BadRequestException("Storage key is required");
    }
    const url = await this.storageService.getUrl(query.key);
    return { key: query.key, url };
  }

  /**
   * Stream / view file content inline with proper Content-Type
   */
  @Get("file")
  @ApiOperation({ summary: "Get stored file stream/buffer inline" })
  @ApiQuery({ name: "key", description: "Storage key of the file" })
  async getFile(
    @Query() query: FileKeyQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    if (!query.key) {
      throw new BadRequestException("Storage key is required");
    }
    const exists = await this.storageService.exists(query.key);
    if (!exists) {
      throw new NotFoundException(`File not found with key: ${query.key}`);
    }

    const buffer = await this.storageService.download(query.key);
    const ext = path.extname(query.key).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".json": "application/json",
      ".txt": "text/plain",
    };
    const mimeType = mimeMap[ext] || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }

  /**
   * Download file as attachment
   */
  @Get("download")
  @ApiOperation({ summary: "Download stored file as attachment" })
  @ApiQuery({ name: "key", description: "Storage key of the file" })
  async downloadFile(
    @Query() query: FileKeyQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    if (!query.key) {
      throw new BadRequestException("Storage key is required");
    }
    const exists = await this.storageService.exists(query.key);
    if (!exists) {
      throw new NotFoundException(`File not found with key: ${query.key}`);
    }

    const buffer = await this.storageService.download(query.key);
    const filename = path.basename(query.key);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }
}
