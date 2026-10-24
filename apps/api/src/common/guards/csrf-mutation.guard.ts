import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";

/**
 * CSRF Protection Guard for Cookie-Authenticated Mutations.
 * 
 * In accordance with OWASP CSRF prevention guidelines:
 * - Bearer tokens in Authorization headers are inherently immune to browser CSRF.
 * - State-changing requests (POST, PUT, PATCH, DELETE) authenticated via ambient cookies
 *   MUST include a custom header (X-Requested-With, X-CSRF-Token, etc.) that cannot be
 *   forged by simple cross-origin HTML forms or scripts.
 */
@Injectable()
export class CsrfMutationGuard implements CanActivate {
  private readonly stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe / idempotent methods (GET, HEAD, OPTIONS) do not require CSRF tokens
    if (!this.stateChangingMethods.has(method)) {
      return true;
    }

    const hasCookieAuth = !!(request.headers.cookie && (
      request.headers.cookie.includes("mastara_session") ||
      request.headers.cookie.includes("token=") ||
      request.headers.cookie.includes("auth=")
    ));

    // If request is authenticated using ambient cookies:
    if (hasCookieAuth) {
      const csrfToken = request.headers["x-csrf-token"];
      const requestedWith = request.headers["x-requested-with"];

      if (!csrfToken && !requestedWith) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: "CSRF_VERIFICATION_FAILED",
          message: "CSRF protection: Missing required X-CSRF-Token or X-Requested-With header on cookie-authenticated mutation.",
        });
      }
    }

    return true;
  }
}
