import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  NotificationsService,
  NotificationResponse,
} from "../services/notifications.service";
import { GetNotificationsQueryDto } from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Engagement: Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary:
      "List notifications for the authenticated student (newest first, optional unread filter)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of notifications",
  })
  async getStudentNotifications(
    @CurrentUser("id") studentId: string,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<NotificationResponse[]> {
    return this.notificationsService.getStudentNotifications(studentId, query);
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a specific notification as read" })
  @ApiParam({ name: "id", description: "UUID of the notification" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notification marked as read",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Notification not found",
  })
  async markAsRead(
    @CurrentUser("id") studentId: string,
    @Param("id", ParseUUIDPipe) notificationId: string,
  ): Promise<NotificationResponse> {
    return this.notificationsService.markAsRead(studentId, notificationId);
  }

  @Patch("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all unread notifications as read" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Count of notifications marked as read",
  })
  async markAllAsRead(
    @CurrentUser("id") studentId: string,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(studentId);
  }
}
