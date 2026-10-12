import { Module } from "@nestjs/common";
import { OutboxController } from "./controllers/outbox.controller";
import { OutboxService } from "./services/outbox.service";

@Module({
  controllers: [OutboxController],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
