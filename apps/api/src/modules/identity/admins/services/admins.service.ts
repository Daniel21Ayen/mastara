import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AdminRole } from "@mastara/database";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { TotpService } from "../../../../common/security/totp.service";
import { CreateAdminDto, UpdateAdminDto, VerifyTotpDto } from "../dto/admin-management.dto";

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totpService: TotpService,
  ) {}

  async listAdmins() {
    const admins = await this.prisma.adminUser.findMany({
      orderBy: { created_at: "asc" },
      include: {
        admin_scopes: true,
      },
    });

    return admins.map((admin: any) => {
      const fullName = `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || null;
      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        fullName,
        full_name: fullName,
        phone_number: null,
        adminRole: admin.admin_role,
        admin_role: admin.admin_role,
        isActive: admin.is_active,
        is_active: admin.is_active,
        totpEnabled: Boolean(admin.totp_secret),
        totp_enabled: Boolean(admin.totp_secret),
        lastLoginAt: admin.last_login_at,
        last_login_at: admin.last_login_at,
        createdAt: admin.created_at,
        created_at: admin.created_at,
        scopes: admin.admin_scopes.map((s: any) => ({
          id: s.id,
          universityId: s.university_id,
          programId: s.program_id,
          courseId: s.course_id,
          university_id: s.university_id,
          program_id: s.program_id,
          course_id: s.course_id,
        })),
      };
    });
  }

  async getAdminById(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      include: {
        admin_scopes: true,
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const fullName = `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || null;
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name,
      fullName,
      full_name: fullName,
      phone_number: null,
      adminRole: admin.admin_role,
      admin_role: admin.admin_role,
      isActive: admin.is_active,
      is_active: admin.is_active,
      totpEnabled: Boolean(admin.totp_secret),
      totp_enabled: Boolean(admin.totp_secret),
      lastLoginAt: admin.last_login_at,
      last_login_at: admin.last_login_at,
      createdAt: admin.created_at,
      created_at: admin.created_at,
      scopes: admin.admin_scopes.map((s: any) => ({
        id: s.id,
        universityId: s.university_id,
        programId: s.program_id,
        courseId: s.course_id,
        university_id: s.university_id,
        program_id: s.program_id,
        course_id: s.course_id,
      })),
    };
  }

  async createAdmin(dto: CreateAdminDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException("An administrator with this email already exists");
    }

    let firstName = dto.first_name?.trim() || "";
    let lastName = dto.last_name?.trim() || "";
    if (!firstName && !lastName && dto.full_name) {
      const parts = dto.full_name.trim().split(/\s+/);
      firstName = parts[0] || "Admin";
      lastName = parts.slice(1).join(" ") || "User";
    }
    if (!firstName) firstName = "Admin";
    if (!lastName) lastName = "User";

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const isActive = dto.is_active !== undefined ? dto.is_active : true;

    return this.prisma.$transaction(async (tx: any) => {
      const admin = await tx.adminUser.create({
        data: {
          email: normalizedEmail,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          admin_role: dto.admin_role,
          is_active: isActive,
        },
      });

      if (dto.scopes && dto.scopes.length > 0) {
        await tx.adminScope.createMany({
          data: dto.scopes.map((s) => ({
            admin_id: admin.id,
            university_id: s.university_id || null,
            program_id: s.program_id || null,
            course_id: s.course_id || null,
          })),
        });
      }

      const fullAdmin = await tx.adminUser.findUnique({
        where: { id: admin.id },
        include: { admin_scopes: true },
      });

      const fullName = `${fullAdmin!.first_name || ""} ${fullAdmin!.last_name || ""}`.trim() || null;
      return {
        id: fullAdmin!.id,
        email: fullAdmin!.email,
        firstName: fullAdmin!.first_name,
        lastName: fullAdmin!.last_name,
        fullName,
        full_name: fullName,
        phone_number: dto.phone_number || null,
        adminRole: fullAdmin!.admin_role,
        admin_role: fullAdmin!.admin_role,
        isActive: fullAdmin!.is_active,
        is_active: fullAdmin!.is_active,
        totpEnabled: false,
        totp_enabled: false,
        lastLoginAt: null,
        last_login_at: null,
        createdAt: fullAdmin!.created_at,
        created_at: fullAdmin!.created_at,
        scopes: fullAdmin!.admin_scopes,
      };
    });
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Last-Super-Admin Guard:
    // If target admin is active SUPER_ADMIN and we are deactivating or changing role
    const isDemotingOrDeactivating =
      admin.admin_role === AdminRole.SUPER_ADMIN &&
      admin.is_active &&
      (dto.is_active === false || (dto.admin_role && dto.admin_role !== AdminRole.SUPER_ADMIN));

    if (isDemotingOrDeactivating) {
      const activeSuperAdmins = await this.prisma.adminUser.count({
        where: { admin_role: AdminRole.SUPER_ADMIN, is_active: true },
      });

      if (activeSuperAdmins <= 1) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: "LAST_SUPER_ADMIN",
          message: "Cannot demote or deactivate the last remaining active SUPER_ADMIN",
        });
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      let firstName = dto.first_name?.trim();
      let lastName = dto.last_name?.trim();
      if (!firstName && !lastName && dto.full_name !== undefined) {
        const parts = dto.full_name.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (dto.email !== undefined) updateData.email = dto.email.trim().toLowerCase();
      if (dto.admin_role !== undefined) updateData.admin_role = dto.admin_role;
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
      if (dto.password) {
        updateData.password_hash = await bcrypt.hash(dto.password, 10);
      }

      await tx.adminUser.update({
        where: { id },
        data: updateData,
      });

      if (dto.scopes !== undefined) {
        await tx.adminScope.deleteMany({
          where: { admin_id: id },
        });

        if (dto.scopes.length > 0) {
          await tx.adminScope.createMany({
            data: dto.scopes.map((s) => ({
              admin_id: id,
              university_id: s.university_id || null,
              program_id: s.program_id || null,
              course_id: s.course_id || null,
            })),
          });
        }
      }

      const updated = await tx.adminUser.findUnique({
        where: { id },
        include: { admin_scopes: true },
      });

      const fullName = `${updated!.first_name || ""} ${updated!.last_name || ""}`.trim() || null;
      return {
        id: updated!.id,
        email: updated!.email,
        firstName: updated!.first_name,
        lastName: updated!.last_name,
        fullName,
        full_name: fullName,
        phone_number: dto.phone_number || null,
        adminRole: updated!.admin_role,
        admin_role: updated!.admin_role,
        isActive: updated!.is_active,
        is_active: updated!.is_active,
        totpEnabled: Boolean(updated!.totp_secret),
        totp_enabled: Boolean(updated!.totp_secret),
        lastLoginAt: updated!.last_login_at,
        last_login_at: updated!.last_login_at,
        createdAt: updated!.created_at,
        created_at: updated!.created_at,
        scopes: updated!.admin_scopes,
      };
    });
  }

  async deleteAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Last-Super-Admin Guard:
    if (admin.admin_role === AdminRole.SUPER_ADMIN && admin.is_active) {
      const activeSuperAdmins = await this.prisma.adminUser.count({
        where: { admin_role: AdminRole.SUPER_ADMIN, is_active: true },
      });

      if (activeSuperAdmins <= 1) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: "LAST_SUPER_ADMIN",
          message: "Cannot demote or delete the last remaining active SUPER_ADMIN",
        });
      }
    }

    await this.prisma.adminUser.delete({
      where: { id },
    });

    return { success: true, message: `Admin ${id} deleted successfully` };
  }

  async setupTotp(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const secret = this.totpService.generateSecret();
    const uri = this.totpService.generateKeyUri(admin.email, secret, "Mastara");

    return {
      secret,
      uri,
    };
  }

  async verifyAndEnableTotp(id: string, dto: VerifyTotpDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const secretToVerify = dto.secret || admin.totp_secret;
    if (!secretToVerify) {
      throw new BadRequestException("No TOTP secret provided or setup for this admin");
    }

    const isValid = this.totpService.verifyTotp(dto.code, secretToVerify);
    if (!isValid) {
      throw new BadRequestException("Invalid two-factor authentication code");
    }

    await this.prisma.adminUser.update({
      where: { id },
      data: { totp_secret: secretToVerify },
    });

    return {
      success: true,
      message: "Two-factor authentication successfully enabled",
      totpEnabled: true,
    };
  }

  async disableTotp(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    await this.prisma.adminUser.update({
      where: { id },
      data: { totp_secret: null },
    });

    return {
      success: true,
      message: "Two-factor authentication disabled",
      totpEnabled: false,
    };
  }
}
