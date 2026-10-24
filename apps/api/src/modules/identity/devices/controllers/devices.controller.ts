import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import { PaginationQueryDto } from "../../../../common/pagination";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  DevicesService,
  DeviceRegistrationResponse,
  DeviceReleaseResponse,
  DeviceStatusResponse,
} from "../services/devices.service";
import { RegisterDeviceDto } from "../dto/register-device.dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Device Management & Security")
@ApiBearerAuth()
@Controller("device")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post("register")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Register or verify hardware device lock for the authenticated student",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Device registered or verified successfully",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Device mismatch: account is locked to a different device",
  })
  async register(
    @CurrentUser("id") studentId: string,
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceRegistrationResponse> {
    return this.devicesService.registerDevice(studentId, dto);
  }

  @Post("release")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Release current device lock allowing binding on a new device",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Device released successfully",
  })
  async release(
    @CurrentUser("id") studentId: string,
  ): Promise<DeviceReleaseResponse> {
    return this.devicesService.releaseDevice(studentId);
  }

  @Get("status")
  @ApiOperation({ summary: "Get current device binding status for authenticated student" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current device binding status",
  })
  async getStatus(
    @CurrentUser("id") studentId: string,
  ): Promise<DeviceStatusResponse> {
    return this.devicesService.getDeviceStatus(studentId);
  }

  @Get()
  @ApiOperation({ summary: "List device bindings with pagination" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paginated list of device bindings",
  })
  async listDevices(@Query() query?: PaginationQueryDto) {
    return this.devicesService.listDevices(query);
  }
}
