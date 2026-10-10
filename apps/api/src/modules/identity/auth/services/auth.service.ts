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
import { RegisterDto, LoginDto, AuthResponseDto } from "../dto";

export interface NormalizedIdentifier {
  isEmail: boolean;
  normalized: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
      throw new ConflictException("A student with this phone or email already exists");
    }

    const nameParts = dto.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Student";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.student.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        email: isEmail ? normalized : null,
        phone: !isEmail ? normalized : null,
        password_hash: passwordHash,
        role: Role.STUDENT,
        status: StudentStatus.ACTIVE,
      },
    });

    try {
      await this.prisma.securityEventLog.create({
        data: {
          student_id: student.id,
          event_type: SecurityEventType.REGISTER,
          metadata: { identifier: dto.identifier },
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
}
