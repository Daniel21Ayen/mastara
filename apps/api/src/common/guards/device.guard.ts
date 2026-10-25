import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { DeviceBindingStatus } from "@mastara/database";

@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const studentId = request.user?.id;

    // Only apply device binding checks to authenticated student requests
    if (!studentId || request.user?.role !== "STUDENT") {
      return true;
    }

    const rawDeviceId =
      request.headers["x-device-id"] || request.headers["device-id"];

    const binding = await this.prisma.deviceBinding.findUnique({
      where: { student_id: studentId },
    });

    // If student has an active device binding, verify the device matches
    if (binding && binding.status === DeviceBindingStatus.ACTIVE) {
      if (!rawDeviceId) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: "DEVICE_MISMATCH_LOCKED",
          message:
            "x-device-id header is required for verified student device access",
        });
      }

      const deviceHash = crypto
        .createHash("sha256")
        .update(String(rawDeviceId).trim())
        .digest("hex");

      if (binding.device_id_hash !== deviceHash) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: "DEVICE_MISMATCH_LOCKED",
          message:
            "Account is locked to another device. Please release previous device or contact support.",
        });
      }
    } else if (binding && binding.status === DeviceBindingStatus.REVOKED) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "DEVICE_MISMATCH_LOCKED",
        message:
          "Your device access has been revoked by administration. Please contact support.",
      });
    }

    return true;
  }
}
