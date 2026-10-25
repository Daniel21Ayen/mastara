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
    const now = Date.now();
    const cached = this.adminCache.get(payload.sub);
    let student = cached && now - cached.cachedAt < this.CACHE_TTL_MS ? cached.student : null;

    if (!student) {
      student = await this.prisma.student.findUnique({
        where: { id: payload.sub },
        include: { admin_scopes: true },
      });

      if (student) {
        this.adminCache.set(payload.sub, { student, cachedAt: now });
      }
    }

    if (!student || student.status !== "ACTIVE") {
      throw new UnauthorizedException("Student account is not active or unauthorized");
    }

    return {
      id: student.id,
      email: student.email,
      phone: student.phone,
      role: student.role,
      adminRole: student.admin_role ?? (student.role === "ADMIN" ? "SUPER_ADMIN" : undefined),
      scopes: student.admin_scopes ?? [],
      firstName: student.first_name,
      lastName: student.last_name,
    };
  }
}
