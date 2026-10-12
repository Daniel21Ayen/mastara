import { Module } from "@nestjs/common";
import { SupportTicketsController } from "./controllers/support-tickets.controller";
import { SupportTicketsService } from "./services/support-tickets.service";

@Module({
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}
