// apps/api/src/common/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasPermission } from "@mastara/domain";
import { Role } from "@mastara/database";
import { PERMISSIONS_KEY } from "../decorators/require-permission.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuditService } from "../../modules/platform/audit/services/audit.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly auditService?: AuditService,
  ) {}

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

    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (isAdminPath) {
        this._logDenied(req, url, requiredPermissions, "Admin endpoint has no declared permission: default-deny enforced");
        throw new ForbiddenException(
          "Admin endpoint has no declared permission: default-deny enforced",
        );
      }
      return true;
    }

    const user = req.user;
    if (!user || user.role !== "ADMIN") {
      this._logDenied(req, url, requiredPermissions, "Access denied: Administrator credentials required");
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
      const reason = `Access denied: Role '${adminRole}' lacks required permissions: [${requiredPermissions.join(", ")}]`;
      this._logDenied(req, url, requiredPermissions, reason);
      throw new ForbiddenException(reason);
    }

    return true;
  }

  private _logDenied(
    req: any,
    url: string,
    requiredPermissions?: string[],
    reason?: string,
  ): void {
    if (!this.auditService) return;
    const user = req.user;
    const actorId = user?.id || user?.sub || "00000000-0000-0000-0000-000000000000";
    const actorRole = user?.role === "ADMIN" ? Role.ADMIN : Role.STUDENT;
    const actorAdminRole = user?.adminRole || null;
    const scope = user?.scope || user?.adminScope || null;

    void this.auditService.log({
      actorId,
      actorRole,
      actorAdminRole,
      scope,
      action: "REQUEST_DENIED",
      targetType: "Route",
      targetId: url,
      metadata: {
        url,
        method: req.method,
        requiredPermissions,
        adminRole: actorAdminRole,
        scope,
        reason: reason || `Denied request on sensitive route ${url}`,
      },
      ipAddress: req.ip || req.headers?.["x-forwarded-for"],
      userAgent: req.headers?.["user-agent"],
    });
  }
}

