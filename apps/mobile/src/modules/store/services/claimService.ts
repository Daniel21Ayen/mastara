// apps/mobile/src/modules/store/services/claimService.ts
import { migrateLocalUserToStudentId } from '@/core/db';
import { httpClient } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { storeApi } from '../api/store.api';

export interface PendingClaim {
  orderId: string;
  reference: string;
  claimSecret: string;
  localAccountId: string;
  submittedAt: number;
  status: 'PENDING' | 'CLAIMED' | 'REJECTED';
  studentCode?: string;
}

export async function getPendingClaims(): Promise<PendingClaim[]> {
  return (await secureStorage.getJson<PendingClaim[]>(STORAGE_KEYS.pendingClaims)) || [];
}

export async function savePendingClaims(claims: PendingClaim[]): Promise<void> {
  await secureStorage.setJson(STORAGE_KEYS.pendingClaims, claims);
}

export async function addPendingClaim(claim: Omit<PendingClaim, 'status'>): Promise<void> {
  const claims = await getPendingClaims();
  const existingIndex = claims.findIndex((c) => c.orderId === claim.orderId);
  const entry: PendingClaim = { ...claim, status: 'PENDING' };
  if (existingIndex >= 0) {
    claims[existingIndex] = entry;
  } else {
    claims.push(entry);
  }
  await savePendingClaims(claims);
}

export interface ClaimResult {
  orderId: string;
  studentCode: string;
  token: string;
  refreshToken?: string;
  entitlementToken?: string;
}

/**
 * Checks all pending claims with the server.
 * If approved, claims the order, migrates SQLite DB to MS0001+, sets auth tokens, and updates session.
 * Requirements: REG-10, REG-12, REG-14.
 */
export async function processPendingClaims(
  onOrderClaimed?: (result: ClaimResult) => void,
): Promise<{ claimed: ClaimResult[]; pendingCount: number }> {
  const claims = await getPendingClaims();
  const claimed: ClaimResult[] = [];
  let updated = false;

  for (const claim of claims) {
    if (claim.status !== 'PENDING') continue;

    try {
      const res = await storeApi.claimOrder(claim.orderId, claim.claimSecret);
      if (res && res.studentCode && res.token) {
        // 1. Migrate local SQLite database from localAccountId to studentCode (REG-12)
        await migrateLocalUserToStudentId(claim.localAccountId, res.studentCode);

        // 2. Set API token
        await httpClient.setToken(res.token);

        // 3. Update session snapshot in secure storage
        const session = await secureStorage.getJson<any>(STORAGE_KEYS.session);
        if (session?.user) {
          session.user.id = res.studentCode;
          session.user.studentCode = res.studentCode;
          await secureStorage.setJson(STORAGE_KEYS.session, session);
        }

        // 4. Update offlineUsers registry and pendingRemoteSync
        const pendingSync = await secureStorage.getJson<any>(STORAGE_KEYS.pendingRemoteSync);
        if (pendingSync) {
          pendingSync.accountState = 'REGISTERED_REMOTE';
          pendingSync.purchased = true;
          pendingSync.userId = res.studentCode;
          delete pendingSync.password;
          await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, pendingSync);

          const norm = (pendingSync.identifier || '').trim().toLowerCase();
          const registry =
            (await secureStorage.getJson<Record<string, any>>(STORAGE_KEYS.offlineUsers)) || {};
          if (registry[norm]) {
            registry[norm].accountState = 'REGISTERED_REMOTE';
            registry[norm].purchased = true;
            registry[norm].userId = res.studentCode;
            delete registry[norm].password;
            await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
          }
        }
        await secureStorage.remove(STORAGE_KEYS.pendingPassword);

        // 5. Store entitlementToken if issued
        if (res.entitlementToken) {
          await secureStorage.setString(STORAGE_KEYS.entitlementKey, res.entitlementToken);
        }

        // 6. Mark claim status
        claim.status = 'CLAIMED';
        claim.studentCode = res.studentCode;
        updated = true;

        const result: ClaimResult = {
          orderId: claim.orderId,
          studentCode: res.studentCode,
          token: res.token,
          refreshToken: res.refreshToken,
          entitlementToken: res.entitlementToken,
        };
        claimed.push(result);
        if (onOrderClaimed) {
          onOrderClaimed(result);
        }
      }
    } catch (err: any) {
      if (
        err?.status === 400 &&
        (err?.code === 'ORDER_REJECTED' ||
          err?.errorCode === 'ORDER_REJECTED' ||
          err?.message?.includes('REJECTED'))
      ) {
        claim.status = 'REJECTED';
        updated = true;
      }
      // If ORDER_NOT_APPROVED, leave as PENDING
    }
  }

  if (updated) {
    await savePendingClaims(claims);
  }

  const pendingCount = claims.filter((c) => c.status === 'PENDING').length;
  return { claimed, pendingCount };
}
