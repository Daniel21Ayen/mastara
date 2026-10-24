import {
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export enum AdminScope {
  SUPER_ADMIN = "SUPER_ADMIN",
  RECEIPT_REVIEWER = "RECEIPT_REVIEWER",
  CONTENT_EDITOR = "CONTENT_EDITOR",
}

export const ADMIN_SCOPES_KEY = "admin_scopes";
export const RequireAdminScope = (...scopes: AdminScope[]) =>
  SetMetadata(ADMIN_SCOPES_KEY, scopes);

@Injectable()
export class AdminScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<AdminScope[]>(
      ADMIN_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== "ADMIN") {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "INSUFFICIENT_PERMISSIONS",
        message: "Access requires administrator privileges.",
      });
    }

    // By default, super admin or unassigned legacy admins possess all scopes
    const userScopes: string[] = user.admin_scopes || [AdminScope.SUPER_ADMIN];
    if (userScopes.includes(AdminScope.SUPER_ADMIN)) {
      return true;
    }

    const hasRequired = requiredScopes.some((reqScope) => userScopes.includes(reqScope));
    if (!hasRequired) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: "INSUFFICIENT_ADMIN_SCOPE",
        message: `Action requires one of the following administrator scopes: [${requiredScopes.join(", ")}]. Current scopes: [${userScopes.join(", ")}]`,
      });
    }

    return true;
  }
}
