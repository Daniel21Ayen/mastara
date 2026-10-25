// apps/api/src/common/decorators/require-permission.decorator.ts
import { SetMetadata } from "@nestjs/common";
import type { AdminPermission } from "@mastara/domain";

export const PERMISSIONS_KEY = "permissions";

/**
 * Declares one or more permissions required to access an admin endpoint.
 * Super Admin ('*') automatically satisfies any required permission.
 */
export const RequirePermission = (...permissions: (AdminPermission | string)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
