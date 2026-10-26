import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";

export interface JwtPayload {
  sub: string;
  role: string;
  identifier: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  private readonly adminCache = new Map<string, { student: any; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000;

  async validate(payload: JwtPayload) {
    if (payload.role === "ADMIN") {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
        include: { admin_scopes: true },
      });

      if (!admin || !admin.is_active) {
        throw new UnauthorizedException("Administrator account is inactive or not found");
      }

      return {
        id: admin.id,
        email: admin.email,
        phone: null,
        role: "ADMIN",
        adminRole: admin.admin_role ?? "SUPER_ADMIN",
        scopes: admin.admin_scopes ?? [],
        firstName: admin.first_name,
        lastName: admin.last_name,
      };
    }

    const student = await this.prisma.student.findUnique({
      where: { id: payload.sub },
    });

    if (!student || student.status !== "ACTIVE") {
      throw new UnauthorizedException("Student account is not active or unauthorized");
    }

    return {
      id: student.id,
      email: student.email,
      phone: student.phone,
      role: student.role,
      adminRole: student.admin_role ?? (student.role === "ADMIN" ? "SUPER_ADMIN" : undefined),
      scopes: [],
      firstName: student.first_name,
      lastName: student.last_name,
    };
  }
}
