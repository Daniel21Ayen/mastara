import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  ContentService,
  TopicListItemResponse,
  TopicDetailResponse,
  RecordProgressResponse,
} from "../services/content.service";
import { RecordProgressDto } from "../dto/record-progress.dto";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";

@ApiTags("Content Delivery & Reader")
@ApiBearerAuth()
@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get("courses/:courseId/topics")
  @ApiOperation({
    summary: "List syllabus topics / chapters for a course with reading progress",
  })
  @ApiParam({ name: "courseId", description: "UUID of the course" })
  @ApiQuery({
    name: "kind",
    required: false,
    enum: ["MODULE", "NOTE"],
    description: "Content kind filter (defaults to MODULE)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of course topics with progress and free-trial indicators",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Course not found" })
  async getCourseTopics(
    @CurrentUser("id") studentId: string,
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Query("kind") kind?: "MODULE" | "NOTE",
  ): Promise<TopicListItemResponse[]> {
    return this.contentService.getCourseTopics(studentId, courseId, kind);
  }

  @Get("topics/:topicId")
  @ApiOperation({
    summary: "Get topic lesson details and bilingual content (en/am)",
  })
  @ApiParam({ name: "topicId", description: "UUID of the topic" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Topic details and bilingual content payload",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Content is locked and requires an active subscription or entitlement",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Topic not found" })
  async getTopic(
    @CurrentUser("id") studentId: string,
    @Param("topicId", ParseUUIDPipe) topicId: string,
  ): Promise<TopicDetailResponse> {
    return this.contentService.getTopic(studentId, topicId);
  }

  @Post("topics/:topicId/progress")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Record or update student reading position and completion status",
  })
  @ApiParam({ name: "topicId", description: "UUID of the topic" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Reading progress recorded successfully",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Topic not found" })
  async recordProgress(
    @CurrentUser("id") studentId: string,
    @Param("topicId", ParseUUIDPipe) topicId: string,
    @Body() dto: RecordProgressDto,
  ): Promise<RecordProgressResponse> {
    return this.contentService.recordProgress(studentId, topicId, dto);
  }
}
