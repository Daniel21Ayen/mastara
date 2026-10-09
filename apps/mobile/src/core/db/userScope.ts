// apps/mobile/src/core/db/userScope.ts
let currentUserId = '';

/** Rows in the local database belong to the signed-in student. The session sets this when the user changes. */
export function setDbUser(userId: string | null): void {
  currentUserId = userId ?? '';
}

export function dbUser(): string {
  return currentUserId;
}
