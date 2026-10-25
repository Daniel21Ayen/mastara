import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { ContentService } from "../services/content.service";
import {
  AdminModuleInputDto,
  AdminTopicInputDto,
  AdminNoteInputDto,
  AdminAmharicNoteInputDto,
} from "../dto/admin-content.dto";
import type {
  ContentCourse,
  ContentSummary,
  AdminModule,
  AdminTopic,
  AdminNote,
} from "@mastara/contracts";

import { RequirePermission } from "../../../common/decorators/require-permission.decorator";
import { PaginationQueryDto } from "../../../common/pagination";

@ApiTags("Admin Content Management")
@ApiBearerAuth()
@RequirePermission("content.write")
@Controller("content/admin")
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get("courses")
  @ApiOperation({ summary: "List courses available in content management studio with optional pagination" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of content courses" })
  async listCourses(@Query() query?: PaginationQueryDto) {
    return this.contentService.listAdminCourses(query);
  }

  @Get("courses/:courseId/summary")
  @ApiOperation({ summary: "Get content summary counts and recent edits for a course" })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiResponse({ status: HttpStatus.OK, description: "Content summary metrics" })
  async getSummary(
    @Param("courseId") courseId: string,
  ): Promise<ContentSummary> {
    return this.contentService.getAdminContentSummary(courseId);
  }

  @Get("courses/:courseId/modules")
  @ApiOperation({ summary: "List modules and syllabus topics for a course" })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of modules" })
  async listModules(
    @Param("courseId") courseId: string,
  ): Promise<AdminModule[]> {
    return this.contentService.listAdminModules(courseId);
  }

  @Post("modules")
  @ApiOperation({ summary: "Create a new module in a course" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Module created" })
  async createModule(
    @Body() dto: AdminModuleInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminModule> {
    return this.contentService.createAdminModule(dto, adminId);
  }

  @Put("modules/:id")
  @ApiOperation({ summary: "Update an existing module" })
  @ApiParam({ name: "id", description: "UUID of the module" })
  @ApiResponse({ status: HttpStatus.OK, description: "Module updated" })
  async updateModule(
    @Param("id") id: string,
    @Body() dto: AdminModuleInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminModule> {
    return this.contentService.updateAdminModule(id, dto, adminId);
  }

  @Post("topics")
  @ApiOperation({ summary: "Add a topic chapter to a module" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Topic created" })
  async addTopic(
    @Body() dto: AdminTopicInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminTopic> {
    return this.contentService.createAdminTopic(dto, adminId);
  }

  @Get("courses/:courseId/notes")
  @ApiOperation({ summary: "List all notes written for a course" })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of notes" })
  async listNotes(
    @Param("courseId") courseId: string,
  ): Promise<AdminNote[]> {
    return this.contentService.listAdminNotes(courseId);
  }

  @Post("notes")
  @ApiOperation({ summary: "Create a new bilingual note" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Note created" })
  async createNote(
    @Body() dto: AdminNoteInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminNote> {
    return this.contentService.createAdminNote(dto, adminId);
  }

  @Put("notes/:id")
  @ApiOperation({ summary: "Update an existing bilingual note" })
  @ApiParam({ name: "id", description: "UUID of the note" })
  @ApiResponse({ status: HttpStatus.OK, description: "Note updated" })
  async updateNote(
    @Param("id") id: string,
    @Body() dto: AdminNoteInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminNote> {
    return this.contentService.updateAdminNote(id, dto, adminId);
  }

  @Patch("notes/:id/amharic")
  @ApiOperation({ summary: "Save or update Amharic translation for a note" })
  @ApiParam({ name: "id", description: "UUID of the note" })
  @ApiResponse({ status: HttpStatus.OK, description: "Amharic note saved" })
  async saveAmharicNotePatch(
    @Param("id") id: string,
    @Body() dto: AdminAmharicNoteInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminNote> {
    return this.contentService.saveAdminAmharicNote(id, dto, adminId);
  }

  @Put("notes/:id/amharic")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save or update Amharic translation for a note (PUT alias)" })
  @ApiParam({ name: "id", description: "UUID of the note" })
  @ApiResponse({ status: HttpStatus.OK, description: "Amharic note saved" })
  async saveAmharicNotePut(
    @Param("id") id: string,
    @Body() dto: AdminAmharicNoteInputDto,
    @CurrentUser("id") adminId: string,
  ): Promise<AdminNote> {
    return this.contentService.saveAdminAmharicNote(id, dto, adminId);
  }
}
