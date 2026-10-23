import { Module } from "@nestjs/common";
import { NotificationsController } from "./controllers/notifications.controller";
import { AdminNotificationsController } from "./controllers/admin-notifications.controller";
import { NotificationsService } from "./services/notifications.service";

@Module({
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

