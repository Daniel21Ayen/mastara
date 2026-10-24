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

  async validate(payload: JwtPayload) {
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
      firstName: student.first_name,
      lastName: student.last_name,
    };
  }
}
