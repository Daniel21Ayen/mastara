import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Public } from "../../../../common/decorators/public.decorator";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { AdminScansService } from "../services/admin-scans.service";
import {
  ScanListQueryDto,
  ListScanCoursesQueryDto,
  RequestUploadUrlsDto,
} from "../dto/admin-scans.dto";
import type {
  AdminScan,
  ScanCourseOption,
  ScanListResult,
} from "@mastara/contracts";

import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";

@ApiTags("Admin Scan to PDF Management")
@ApiBearerAuth()
@RequirePermission("scans.write")
@Controller("content/admin/scans")
export class AdminScansController {
  constructor(private readonly scansService: AdminScansService) {}

  @Get()
  @ApiOperation({ summary: "List scanned documents with filtering, search and pagination" })
  @ApiResponse({ status: HttpStatus.OK, description: "Paginated list of scans" })
  async listScans(@Query() query: ScanListQueryDto): Promise<ScanListResult> {
    return this.scansService.listScans(query);
  }

  @Get("courses")
  @ApiOperation({ summary: "List course options available for chosen program, semester and stream" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of courses" })
  async listCourses(
    @Query() query: ListScanCoursesQueryDto,
  ): Promise<ScanCourseOption[]> {
    return this.scansService.listCourses(
      query.programId,
      query.semesterNumber,
      query.stream,
    );
  }

  @Post("upload-urls")
  @ApiOperation({ summary: "Generate presigned S3 upload URLs for scanned pages" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of presigned upload URLs" })
  async getUploadUrls(@Body() body: RequestUploadUrlsDto) {
    const urls = await this.scansService.getUploadUrls(body.files);
    return { urls };
  }

  @Get(":id/status")
  @ApiOperation({ summary: "Check background BullMQ PDF conversion and OCR status" })
  @ApiParam({ name: "id", description: "Scan Job UUID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Job status" })
  async getStatus(@Param("id") id: string) {
    return this.scansService.getScanStatus(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get detailed scan document record by ID" })
  @ApiParam({ name: "id", description: "Scan UUID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Scan details" })
  async getScan(@Param("id") id: string): Promise<AdminScan> {
    return this.scansService.getScan(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new scan document and dispatch to background worker" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Scan job created and queued" })
  async createScan(
    @Body() body: unknown,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminScan> {
    return this.scansService.createScan(body, adminId);
  }

  // ── Fallback storage endpoints for local development ──

  @Public()
  @Put("storage-upload/:key(*)")
  @ApiOperation({ summary: "Local development storage upload handler" })
  async handleLocalUpload(
    @Param("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        await this.scansService.saveLocalUpload(key, buffer);
        res.status(HttpStatus.OK).json({ success: true, key });
      } catch (err: any) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
      }
    });
  }

  @Public()
  @Get("storage-download/:key(*)")
  @ApiOperation({ summary: "Local development storage download handler" })
  async handleLocalDownload(
    @Param("key") key: string,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.scansService.getLocalDownload(key);
      const isPdf = key.endsWith(".pdf");
      const isPng = key.endsWith(".png");
      const isJpg = key.endsWith(".jpg") || key.endsWith(".jpeg");
      const contentType = isPdf
        ? "application/pdf"
        : isPng
        ? "image/png"
        : isJpg
        ? "image/jpeg"
        : "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.send(buffer);
    } catch {
      res.status(HttpStatus.NOT_FOUND).send("File not found");
    }
  }
}
