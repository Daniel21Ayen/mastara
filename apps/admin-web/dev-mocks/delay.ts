// apps/admin-web/src/core/mock/delay.ts

/** Simulates a network call so loading states are visible while we use mock data. */
export async function simulateLatency(ms = 250): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
