// apps/api/src/infrastructure/push/expo-push.service.ts
import { Injectable } from "@nestjs/common";
import { PushService } from "./push.service";

/**
 * ExpoPushService provides backward-compatible injection of the push notification engine.
 */
@Injectable()
export class ExpoPushService extends PushService {}

export * from "./push.types";
export * from "./push.service";
