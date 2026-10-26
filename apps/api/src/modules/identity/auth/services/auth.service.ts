import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role, StudentStatus, SecurityEventType } from "@mastara/database";
import { getPermissionsForRole } from "@mastara/domain";
import { RegisterDto, LoginDto, AuthResponseDto, AdminAuthResponseDto } from "../dto";

export interface NormalizedIdentifier {
  isEmail: boolean;
  normalized: string;
}

import { TotpService } from "../../../../common/security/totp.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
  ) {}

  normalizeIdentifier(identifier: string): NormalizedIdentifier {
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
      return { isEmail: true, normalized: trimmed.toLowerCase() };
    }

    const clean = trimmed.replace(/[\s\-\(\)]/g, "");
    let phone = clean;
    if (clean.startsWith("+251")) {
      phone = clean;
    } else if (clean.startsWith("251")) {
      phone = `+${clean}`;
    } else if (clean.startsWith("09")) {
      phone = `+251${clean.slice(1)}`;
    } else if (clean.startsWith("9")) {
      phone = `+251${clean}`;
    }

    return { isEmail: false, normalized: phone };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const { isEmail, normalized } = this.normalizeIdentifier(dto.identifier);

    // 1. Idempotency Check: if localAccountId was provided, check if already registered
    if (dto.localAccountId) {
      const existingById = await this.prisma.student.findUnique({
        where: { id: dto.localAccountId },
      });
      if (existingById) {
        const identifier = existingById.email || existingById.phone || dto.identifier;
        const token = this.jwtService.sign({
          sub: existingById.id,
          role: existingById.role,
          identifier,
        });
        return {
          user: {
            id: existingById.id,
            name: `${existingById.first_name} ${existingById.last_name}`.trim(),
            identifier,
          },
          token,
        };
      }
    }

    // 2. Phone / Email collision check
    const existingStudent = await this.prisma.student.findFirst({
      where: {
        OR: [
          isEmail ? { email: normalized } : { phone: normalized },
          { email: dto.identifier.trim().toLowerCase() },
          { phone: dto.identifier.trim() },
        ],
      },
    });

    if (existingStudent) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: "PHONE_COLLISION",
        message: "A student with this phone number or email is already registered. Please sign in or contact an administrator.",
      });
    }

    const nameParts = dto.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Student";
    const lastName = nameParts.slice(1).join(" ") || "User";
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 3. Gapless MS ID creation inside an atomic PostgreSQL transaction
    // If the transaction fails, the counter rolls back with it, guaranteeing no gaps!
    const student = await this.prisma.$transaction(async (tx) => {
      // Atomically increment counter with row-level lock
      const counterRows: any = await tx.$queryRawUnsafe(`
        UPDATE counters
        SET value = value + 1
        WHERE name = 'student_ms_code'
        RETURNING value;
      `);

      const rawVal = counterRows?.[0]?.value ?? 1n;
      const nextVal = Number(rawVal);
      // Format: MS + at least 4 digits (e.g. MS0001, MS9999, widening to MS10000 past 9999)
      const studentCode = `MS${nextVal.toString().padStart(4, "0")}`;

      return tx.student.create({
        data: {
          ...(dto.localAccountId ? { id: dto.localAccountId } : {}),
          student_number: nextVal,
          student_code: studentCode,
          first_name: firstName,
          last_name: lastName,
          email: isEmail ? normalized : null,
          phone: !isEmail ? normalized : null,
          password_hash: passwordHash,
          role: Role.STUDENT,
          status: StudentStatus.ACTIVE,
        },
      });
    });

    try {
      await this.prisma.securityEventLog.create({
        data: {
          student_id: student.id,
          event_type: SecurityEventType.REGISTER,
          metadata: { identifier: dto.identifier, studentCode: student.student_code },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to log register security event: ${e}`);
    }

    const identifier = student.email || student.phone || dto.identifier;
    const token = this.jwtService.sign({
      sub: student.id,
      role: student.role,
      identifier,
    });

    return {
      user: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`.trim(),
        identifier,
      },
      token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { isEmail, normalized } = this.normalizeIdentifier(dto.identifier);

    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          isEmail ? { email: normalized } : { phone: normalized },
          { email: dto.identifier.trim().toLowerCase() },
          { phone: dto.identifier.trim() },
        ],
      },
    });

    if (!student) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: "UNAUTHORIZED",
        message: "Invalid identifier or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, student.password_hash);
    if (!isPasswordValid) {
      try {
        await this.prisma.securityEventLog.create({
          data: {
            student_id: student.id,
            event_type: SecurityEventType.LOGIN_FAILED,
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to log failed login: ${e}`);
      }

      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: "UNAUTHORIZED",
        message: "Invalid identifier or password",
      });
    }

    if (student.status !== StudentStatus.ACTIVE) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "ACCOUNT_INACTIVE",
        message: "Your account has been deactivated or suspended",
      });
    }

    try {
      await this.prisma.securityEventLog.create({
        data: {
          student_id: student.id,
          event_type: SecurityEventType.LOGIN_SUCCESS,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to log login success: ${e}`);
    }

    const identifier = student.email || student.phone || dto.identifier;
    const token = this.jwtService.sign({
      sub: student.id,
      role: student.role,
      identifier,
    });

    return {
      user: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`.trim(),
        identifier,
      },
      token,
    };
  }

  async adminLogin(dto: LoginDto): Promise<AdminAuthResponseDto> {
    const trimmedIdentifier = dto.identifier.trim();
    const normalizedEmail = trimmedIdentifier.toLowerCase();

    // Query separate admin_user table per SRS 10.3
    const user = await this.prisma.adminUser.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { email: trimmedIdentifier },
        ],
      },
      include: {
        admin_scopes: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: "UNAUTHORIZED",
        message: "Invalid administrator credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      try {
        await this.prisma.securityEventLog.create({
          data: {
            event_type: SecurityEventType.LOGIN_FAILED,
            metadata: { context: "admin_portal", admin_id: user.id },
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to log admin login failure: ${e}`);
      }

      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: "UNAUTHORIZED",
        message: "Invalid administrator credentials",
      });
    }

    if (!user.is_active) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "ACCOUNT_INACTIVE",
        message: "Your administrator account has been deactivated or suspended",
      });
    }

    // TOTP two-factor authentication requirement for Super Admin and Operations Admin
    const adminRole = (user.admin_role || "SUPER_ADMIN") as "SUPER_ADMIN" | "ACADEMIC_ADMIN" | "OPERATIONS_ADMIN";
    const requiresTotp = adminRole === "SUPER_ADMIN" || adminRole === "OPERATIONS_ADMIN";
    const totpInput = ((dto as any).totp_code || (dto as any).totpCode || "").toString().trim();

    if (requiresTotp) {
      if (user.totp_secret) {
        if (!totpInput) {
          throw new UnauthorizedException({
            statusCode: 401,
            errorCode: "MFA_REQUIRED",
            message: "Two-factor authentication code is required for your administrator role",
            requiresTotp: true,
          });
        }
        const isValid = this.totpService.verifyTotp(totpInput, user.totp_secret);
        if (!isValid) {
          throw new UnauthorizedException({
            statusCode: 401,
            errorCode: "INVALID_TOTP",
            message: "Invalid two-factor authentication code",
          });
        }
      } else if (totpInput) {
        throw new UnauthorizedException({
          statusCode: 401,
          errorCode: "INVALID_TOTP",
          message: "Two-factor authentication is not yet configured for this account",
        });
      }
    }

    // Record last login time on admin_user
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    try {
      await this.prisma.securityEventLog.create({
        data: {
          event_type: SecurityEventType.LOGIN_SUCCESS,
          metadata: { context: "admin_portal", admin_id: user.id },
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to log admin login success: ${e}`);
    }

    // Cap admin session tokens at 12 hours per SRS 10.3
    const token = this.jwtService.sign(
      {
        sub: user.id,
        role: "ADMIN",
        adminRole,
        identifier: user.email,
      },
      {
        expiresIn: "12h",
      } as any,
    );

    const permissions = [...getPermissionsForRole(adminRole)];

    return {
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email,
        identifier: user.email,
        role: "ADMIN",
        adminRole,
        permissions,
        scopes: user.admin_scopes?.map((s) => ({
          id: s.id,
          universityId: s.university_id,
          programId: s.program_id,
          courseId: s.course_id,
        })) ?? [],
      },
      token,
    };
  }
}
