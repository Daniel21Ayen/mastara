import {
  Injectable,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import {
  DevicePlatform,
  DeviceBindingStatus,
  SecurityEventType,
} from "@mastara/database";
import { RegisterDeviceDto } from "../dto/register-device.dto";

export interface DeviceRegistrationResponse {
  bound: boolean;
  message: string;
}

export interface DeviceReleaseResponse {
  success: boolean;
  message: string;
}

export interface DeviceStatusResponse {
  bound: boolean;
  deviceName: string | null;
  platform: DevicePlatform | null;
  status: DeviceBindingStatus | null;
  lastSeenAt: Date | null;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  hashDeviceId(deviceId: string): string {
    return crypto.createHash("sha256").update(deviceId.trim()).digest("hex");
  }

  async registerDevice(
    studentId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceRegistrationResponse> {
    const deviceHash = this.hashDeviceId(dto.deviceId);
    const platform = dto.platform || DevicePlatform.ANDROID;

    const existingBinding = await this.prisma.deviceBinding.findUnique({
      where: { student_id: studentId },
    });

    // Case 1: No previous binding exists
    if (!existingBinding) {
      await this.prisma.deviceBinding.create({
        data: {
          student_id: studentId,
          device_id_hash: deviceHash,
          device_name: dto.deviceName || null,
          platform,
          status: DeviceBindingStatus.ACTIVE,
          bound_at: new Date(),
          last_seen_at: new Date(),
        },
      });

      try {
        await this.prisma.securityEventLog.create({
          data: {
            student_id: studentId,
            event_type: SecurityEventType.DEVICE_BOUND,
            device_id_hash: deviceHash,
            metadata: { deviceName: dto.deviceName, platform },
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to log DEVICE_BOUND event: ${e}`);
      }

      return {
        bound: true,
        message: "Device registered and bound successfully",
      };
    }

    // Case 2: Binding was previously released -> re-bind to new device
    if (existingBinding.status === DeviceBindingStatus.RELEASED) {
      await this.prisma.deviceBinding.update({
        where: { student_id: studentId },
        data: {
          device_id_hash: deviceHash,
          device_name: dto.deviceName || null,
          platform,
          status: DeviceBindingStatus.ACTIVE,
          bound_at: new Date(),
          released_at: null,
          last_seen_at: new Date(),
        },
      });

      try {
        await this.prisma.securityEventLog.create({
          data: {
            student_id: studentId,
            event_type: SecurityEventType.DEVICE_BOUND,
            device_id_hash: deviceHash,
            metadata: { deviceName: dto.deviceName, platform },
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to log DEVICE_BOUND event: ${e}`);
      }

      return {
        bound: true,
        message: "Device registered and bound successfully",
      };
    }

    // Case 3: Binding was revoked by admin
    if (existingBinding.status === DeviceBindingStatus.REVOKED) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "DEVICE_MISMATCH_LOCKED",
        message:
          "Your device access has been revoked by administration. Please contact support.",
      });
    }

    // Case 4: Active binding exists -> verify hash
    if (existingBinding.device_id_hash === deviceHash) {
      // Same device verified: update last_seen_at and name if updated
      await this.prisma.deviceBinding.update({
        where: { student_id: studentId },
        data: {
          last_seen_at: new Date(),
          device_name: dto.deviceName || existingBinding.device_name,
        },
      });

      return {
        bound: true,
        message: "Device verified",
      };
    }

    // Case 5: Active binding exists on a DIFFERENT device!
    try {
      await this.prisma.securityEventLog.create({
        data: {
          student_id: studentId,
          event_type: SecurityEventType.DEVICE_MISMATCH,
          device_id_hash: deviceHash,
          metadata: {
            attemptedDeviceName: dto.deviceName,
            boundDeviceName: existingBinding.device_name,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to log DEVICE_MISMATCH event: ${e}`);
    }

    throw new ForbiddenException({
      statusCode: 403,
      errorCode: "DEVICE_MISMATCH_LOCKED",
      message:
        "Account is locked to another device. Please release previous device or contact support.",
    });
  }

  async releaseDevice(studentId: string): Promise<DeviceReleaseResponse> {
    const existingBinding = await this.prisma.deviceBinding.findUnique({
      where: { student_id: studentId },
    });

    if (
      !existingBinding ||
      existingBinding.status !== DeviceBindingStatus.ACTIVE
    ) {
      return {
        success: true,
        message: "No active device binding found to release",
      };
    }

    await this.prisma.deviceBinding.update({
      where: { student_id: studentId },
      data: {
        status: DeviceBindingStatus.RELEASED,
        released_at: new Date(),
      },
    });

    try {
      await this.prisma.securityEventLog.create({
        data: {
          student_id: studentId,
          event_type: SecurityEventType.DEVICE_RELEASED,
          device_id_hash: existingBinding.device_id_hash,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to log DEVICE_RELEASED event: ${e}`);
    }

    return {
      success: true,
      message: "Device released successfully",
    };
  }

  async getDeviceStatus(studentId: string): Promise<DeviceStatusResponse> {
    const binding = await this.prisma.deviceBinding.findUnique({
      where: { student_id: studentId },
    });

    if (!binding) {
      return {
        bound: false,
        deviceName: null,
        platform: null,
        status: null,
        lastSeenAt: null,
      };
    }

    return {
      bound: binding.status === DeviceBindingStatus.ACTIVE,
      deviceName: binding.device_name,
      platform: binding.platform,
      status: binding.status,
      lastSeenAt: binding.last_seen_at,
    };
  }

  async listDevices(query?: any): Promise<any> {
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query?.pageSize ?? 10));
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.deviceBinding.count(),
      this.prisma.deviceBinding.findMany({
        skip,
        take: pageSize,
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        include: {
          student: {
            select: { id: true, student_code: true, first_name: true, last_name: true },
          },
        },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items,
      page,
      pageSize,
      total,
      totalPages,
      pageCount: totalPages,
    };
  }
}

