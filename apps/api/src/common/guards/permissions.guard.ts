// apps/api/src/common/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasPermission } from "@mastara/domain";
import { PERMISSIONS_KEY } from "../decorators/require-permission.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();
    const url: string = req.url || req.raw?.url || "";

    // Default-deny check: Any route under an admin path (/admin/ or /.../admin/)
    // MUST declare at least one explicit permission.
    const isAdminPath =
      url.includes("/admin") ||
      context.getClass().name.toLowerCase().includes("admin");

    if ((!requiredPermissions || requiredPermissions.length === 0)) {
      if (isAdminPath) {
        throw new ForbiddenException(
          "Admin endpoint has no declared permission: default-deny enforced",
        );
      }
      return true;
    }

    const user = req.user;
    if (!user || user.role !== "ADMIN") {
      throw new ForbiddenException("Access denied: Administrator credentials required");
    }

    const adminRole = user.adminRole || "SUPER_ADMIN";

    // Super Admin has wildcard access to all endpoints
    if (adminRole === "SUPER_ADMIN") {
      return true;
    }

    // Verify if user's admin role has at least one of the required permissions
    const allowed = requiredPermissions.some((perm) => hasPermission(adminRole, perm));
    if (!allowed) {
      throw new ForbiddenException(
        `Access denied: Role '${adminRole}' lacks required permissions: [${requiredPermissions.join(", ")}]`,
      );
    }

    return true;
  }
}
