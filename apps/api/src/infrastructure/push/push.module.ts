// apps/api/src/infrastructure/push/push.module.ts
import { Global, Module } from "@nestjs/common";
import { PushService } from "./push.service";
import { ExpoPushService } from "./expo-push.service";

@Global()
@Module({
  providers: [PushService, ExpoPushService],
  exports: [PushService, ExpoPushService],
})
export class PushModule {}
