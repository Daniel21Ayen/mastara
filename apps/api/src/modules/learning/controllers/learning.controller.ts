import { Controller, Get, HttpStatus } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  LearningService,
  MyCourseResponse,
  HomeSummaryResponse,
} from "../services/learning.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";

@ApiTags("Learning & My Courses")
@ApiBearerAuth()
@Controller("learning")
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get("my-courses")
  @ApiOperation({
    summary:
      "Get student's enrolled courses with current access entitlement state and chapter progress",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of enrolled courses with access and chapter metrics",
  })
  async getMyCourses(
    @CurrentUser("id") studentId: string,
  ): Promise<MyCourseResponse[]> {
    return this.learningService.getMyCourses(studentId);
  }

  @Get("home-summary")
  @ApiOperation({
    summary:
      "Get home dashboard summary including continue learning card, overall progress, and recent activity",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Home dashboard summary and aggregated stats",
  })
  async getHomeSummary(
    @CurrentUser("id") studentId: string,
  ): Promise<HomeSummaryResponse> {
    return this.learningService.getHomeSummary(studentId);
  }
}
