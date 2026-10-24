import { Injectable, HttpException, HttpStatus } from "@nestjs/common";

interface AttemptRecord {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil: number;
}

@Injectable()
export class AdminThrottlerService {
  private readonly accountAttempts = new Map<string, AttemptRecord>();
  private readonly ipAttempts = new Map<string, { count: number; windowStart: number }>();

  // Thresholds
  private readonly MAX_ACCOUNT_ATTEMPTS = 5;
  private readonly ACCOUNT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ACCOUNT_WINDOW_MS = 15 * 60 * 1000;  // 15 minutes

  private readonly MAX_IP_ATTEMPTS_PER_MIN = 10;
  private readonly IP_WINDOW_MS = 60 * 1000; // 1 minute

  checkLoginAllowed(identifier: string, ip: string): void {
    const now = Date.now();
    const cleanId = identifier.trim().toLowerCase();
    const cleanIp = (ip || "unknown").replace(/^::ffff:/, "");

    // 1. Check IP rate limit (10 attempts / min)
    const ipRecord = this.ipAttempts.get(cleanIp);
    if (ipRecord) {
      if (now - ipRecord.windowStart < this.IP_WINDOW_MS) {
        if (ipRecord.count >= this.MAX_IP_ATTEMPTS_PER_MIN) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              errorCode: "RATE_LIMIT_EXCEEDED",
              message: "Too many login attempts from this IP address. Please try again in 1 minute.",
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      } else {
        // Window expired, reset
        this.ipAttempts.set(cleanIp, { count: 0, windowStart: now });
      }
    }

    // 2. Check Account lockout (5 failures / 15 min)
    const accountRecord = this.accountAttempts.get(cleanId);
    if (accountRecord) {
      if (accountRecord.lockedUntil > now) {
        const remainingMinutes = Math.ceil((accountRecord.lockedUntil - now) / 60000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            errorCode: "ACCOUNT_LOCKED",
            message: `Administrator account is temporarily locked due to repeated failed logins. Please try again in ${remainingMinutes} minute(s).`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  recordLoginFailure(identifier: string, ip: string): void {
    const now = Date.now();
    const cleanId = identifier.trim().toLowerCase();
    const cleanIp = (ip || "unknown").replace(/^::ffff:/, "");

    // Increment IP count
    const ipRecord = this.ipAttempts.get(cleanIp) || { count: 0, windowStart: now };
    if (now - ipRecord.windowStart > this.IP_WINDOW_MS) {
      ipRecord.count = 1;
      ipRecord.windowStart = now;
    } else {
      ipRecord.count += 1;
    }
    this.ipAttempts.set(cleanIp, ipRecord);

    // Increment Account failures
    let accRecord = this.accountAttempts.get(cleanId);
    if (!accRecord || now - accRecord.lastAttemptAt > this.ACCOUNT_WINDOW_MS) {
      accRecord = {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: 0,
      };
    } else {
      accRecord.attempts += 1;
      accRecord.lastAttemptAt = now;
    }

    if (accRecord.attempts >= this.MAX_ACCOUNT_ATTEMPTS) {
      accRecord.lockedUntil = now + this.ACCOUNT_LOCKOUT_MS;
    }

    this.accountAttempts.set(cleanId, accRecord);
  }

  recordLoginSuccess(identifier: string, ip: string): void {
    const cleanId = identifier.trim().toLowerCase();
    this.accountAttempts.delete(cleanId);
  }
}
