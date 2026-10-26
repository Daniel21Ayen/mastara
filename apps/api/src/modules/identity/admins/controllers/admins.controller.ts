import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { PermissionsGuard } from "../../../../common/guards/permissions.guard";
import { AdminsService } from "../services/admins.service";
import { CreateAdminDto, UpdateAdminDto, VerifyTotpDto } from "../dto/admin-management.dto";

@ApiTags("Admin Management")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("admins")
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "List all administrators and their assigned scopes" })
  async listAdmins() {
    return this.adminsService.listAdmins();
  }

  @Get(":id")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Get details and scopes for a specific administrator" })
  async getAdmin(@Param("id") id: string) {
    return this.adminsService.getAdminById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Create a new administrator account (Super Admin only)" })
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminsService.createAdmin(dto);
  }

  @Put(":id")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Update administrator details, role, or scopes (PUT alias)" })
  async updateAdminPut(@Param("id") id: string, @Body() dto: UpdateAdminDto) {
    return this.adminsService.updateAdmin(id, dto);
  }

  @Patch(":id")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Update administrator details, role, or scopes" })
  async updateAdmin(@Param("id") id: string, @Body() dto: UpdateAdminDto) {
    return this.adminsService.updateAdmin(id, dto);
  }

  @Delete(":id")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Delete an administrator account" })
  async deleteAdmin(@Param("id") id: string) {
    return this.adminsService.deleteAdmin(id);
  }

  @Post(":id/totp/setup")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Generate TOTP secret and QR code URI for an administrator" })
  async setupTotp(@Param("id") id: string) {
    return this.adminsService.setupTotp(id);
  }

  @Post(":id/totp/verify")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Verify and enable TOTP two-factor authentication" })
  async verifyTotp(@Param("id") id: string, @Body() dto: VerifyTotpDto) {
    return this.adminsService.verifyAndEnableTotp(id, dto);
  }

  @Post(":id/totp/disable")
  @RequirePermission("admins.manage")
  @ApiOperation({ summary: "Disable TOTP two-factor authentication" })
  async disableTotp(@Param("id") id: string) {
    return this.adminsService.disableTotp(id);
  }
}
