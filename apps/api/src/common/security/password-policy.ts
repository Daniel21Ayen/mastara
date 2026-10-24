// apps/api/src/common/security/password-policy.ts

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const COMMON_DISALLOWED_PATTERNS = [
  /password/i,
  /admin/i,
  /mastara/i,
  /123456/,
  /qwerty/i,
  /welcome/i,
  /letmein/i,
];

/**
 * Enterprise Password Policy for Administrators:
 * - Minimum 12 characters length
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 * - At least one special symbol (!@#$%^&*...)
 * - Rejection of common dictionary/brand words
 */
export function validateAdminPassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Password must be a non-empty string"] };
  }

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  for (const pattern of COMMON_DISALLOWED_PATTERNS) {
    if (pattern.test(password)) {
      errors.push("Password contains forbidden common or guessable pattern");
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
