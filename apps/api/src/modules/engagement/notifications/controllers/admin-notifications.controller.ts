import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { CurrentUser, CurrentUserPayload } from "../../../../common/decorators/current-user.decorator";
import { NotificationsService } from "../services/notifications.service";
import { SendBroadcastDto } from "../dto";

@ApiTags("Admin: Notifications & Broadcasts")
@ApiBearerAuth()
@RequirePermission("announce.course", "announce.ops")
@Controller("notifications/admin")
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("broadcasts")
  @ApiOperation({ summary: "List past student announcements and broadcasts" })
  async listBroadcasts() {
    return this.notificationsService.listBroadcasts();
  }

  @Post("broadcast")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Send a broadcast announcement to targeted students with instant push alerts" })
  async sendBroadcast(
    @CurrentUser() admin: CurrentUserPayload,
    @Body() dto: SendBroadcastDto,
  ) {
    const adminName = admin?.firstName
      ? `${admin.firstName} ${admin.lastName ?? ""}`.trim()
      : "Admin (System)";
    return this.notificationsService.sendBroadcast(admin.id, adminName, dto);
  }

  @Get("notifications")
  @ApiOperation({ summary: "List admin system notifications and operational alerts" })
  async getAdminNotifications() {
    return this.notificationsService.getAdminNotifications();
  }

  @Patch("notifications/:id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark an admin notification as read" })
  @ApiParam({ name: "id", description: "ID of the notification" })
  async markNotificationRead(@Param("id") id: string) {
    return this.notificationsService.markAdminNotificationRead(id);
  }

  @Post("notifications/read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all admin notifications as read" })
  async markAllNotificationsRead() {
    return this.notificationsService.markAllAdminNotificationsRead();
  }

  @Delete("notifications/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove/dismiss an admin notification" })
  @ApiParam({ name: "id", description: "ID of the notification" })
  async removeNotification(@Param("id") id: string) {
    return this.notificationsService.removeAdminNotification(id);
  }
}
