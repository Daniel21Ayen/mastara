import { Module } from "@nestjs/common";
import { NotificationsModule } from "./notifications/notifications.module";
import { SupportTicketsModule } from "./support-tickets/support-tickets.module";

@Module({
  imports: [NotificationsModule, SupportTicketsModule],
  exports: [NotificationsModule, SupportTicketsModule],
})
export class EngagementModule {}
