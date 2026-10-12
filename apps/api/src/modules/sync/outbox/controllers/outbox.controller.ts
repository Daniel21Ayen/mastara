import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { OutboxService, SyncResult } from "../services/outbox.service";
import { SyncOutboxDto } from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { createHash } from "crypto";

@ApiTags("Sync")
@ApiBearerAuth()
@Controller("sync/outbox")
export class OutboxController {
  constructor(private readonly outboxService: OutboxService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Upload a batch of offline operations queued on the device for server-side application",
  })
  @ApiHeader({
    name: "X-Device-Id",
    required: false,
    description: "Device identifier — used to correlate device-originated events",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Array of results per operation: accepted | already_applied | rejected",
  })
  async applyBatch(
    @CurrentUser("id") studentId: string,
    @Body() dto: SyncOutboxDto,
    @Headers("x-device-id") rawDeviceId?: string,
  ): Promise<SyncResult[]> {
    const deviceIdHash = rawDeviceId
      ? createHash("sha256").update(rawDeviceId).digest("hex").slice(0, 16)
      : "unknown";

    return this.outboxService.applyBatch(studentId, deviceIdHash, dto);
  }
}
