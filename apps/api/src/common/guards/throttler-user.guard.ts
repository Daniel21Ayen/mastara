import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ThrottlerUserGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const studentId = req.user?.id || req.user?.sub;
    const deviceId = req.headers?.["x-device-id"] || req.headers?.["device-id"];

    if (studentId && deviceId) {
      return `student:${studentId}:device:${deviceId}`;
    }
    if (studentId) {
      return `student:${studentId}`;
    }
    if (deviceId) {
      return `device:${deviceId}`;
    }
    return (req.ips?.length ? req.ips[0] : req.ip) || "unknown";
  }
}
