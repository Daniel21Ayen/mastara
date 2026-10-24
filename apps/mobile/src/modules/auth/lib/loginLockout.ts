// apps/mobile/src/modules/auth/lib/loginLockout.ts
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

interface LockoutRecord {
  attempts: number;
  lastAttemptAt: number;
  lockedUntil: number;
}

type LockoutRegistry = Record<string, LockoutRecord>;

function getBackoffDurationSeconds(attempts: number): number {
  if (attempts < 3) return 0;
  if (attempts < 5) return 30;       // 3-4 attempts: 30 seconds delay
  if (attempts < 8) return 300;      // 5-7 attempts: 5 minutes delay
  return 900;                        // 8+ attempts: 15 minutes delay
}

async function getRegistry(): Promise<LockoutRegistry> {
  return (await secureStorage.getJson<LockoutRegistry>(STORAGE_KEYS.authLockout)) || {};
}

async function saveRegistry(registry: LockoutRegistry): Promise<void> {
  await secureStorage.setJson(STORAGE_KEYS.authLockout, registry);
}

export async function checkLockout(identifier: string): Promise<{
  locked: boolean;
  remainingSeconds: number;
}> {
  const norm = identifier.trim().toLowerCase();
  const registry = await getRegistry();
  const record = registry[norm];

  if (!record) {
    return { locked: false, remainingSeconds: 0 };
  }

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSeconds };
  }

  return { locked: false, remainingSeconds: 0 };
}

export async function recordFailedAttempt(identifier: string): Promise<{
  locked: boolean;
  remainingSeconds: number;
}> {
  const norm = identifier.trim().toLowerCase();
  const registry = await getRegistry();
  const now = Date.now();
  const existing = registry[norm] || {
    attempts: 0,
    lastAttemptAt: now,
    lockedUntil: 0,
  };

  // If last failure was more than 1 hour ago, reset attempt counter
  if (now - existing.lastAttemptAt > 60 * 60 * 1000) {
    existing.attempts = 1;
  } else {
    existing.attempts += 1;
  }
  existing.lastAttemptAt = now;

  const backoffSec = getBackoffDurationSeconds(existing.attempts);
  if (backoffSec > 0) {
    existing.lockedUntil = now + backoffSec * 1000;
  } else {
    existing.lockedUntil = 0;
  }

  registry[norm] = existing;
  await saveRegistry(registry);

  const remainingSeconds = Math.ceil((existing.lockedUntil - now) / 1000);
  return {
    locked: remainingSeconds > 0,
    remainingSeconds: Math.max(0, remainingSeconds),
  };
}

export async function clearLockout(identifier: string): Promise<void> {
  const norm = identifier.trim().toLowerCase();
  const registry = await getRegistry();
  if (registry[norm]) {
    delete registry[norm];
    await saveRegistry(registry);
  }
}
