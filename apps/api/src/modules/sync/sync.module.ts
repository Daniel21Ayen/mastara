import { Module } from "@nestjs/common";
import { OutboxModule } from "./outbox/outbox.module";

@Module({
  imports: [OutboxModule],
  exports: [OutboxModule],
})
export class SyncModule {}
