import { adminAuthResultSchema } from '@mastara/contracts';
import { ADMIN_ERROR_CODES } from '@mastara/domain';
import { ApiError } from '../src/core/network/ApiError';
import { httpClient } from '../src/core/network/httpClient';
import { realAdminAuthApi } from '../src/modules/auth/api/auth.api';
import { realDashboardApi } from '../src/modules/dashboard/api/dashboard.api';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`, details || '');
    failed++;
  }
}

async function runFrontendNetworkAuthTests() {
  console.log('=== Testing Frontend httpClient and realAdminAuthApi ===\n');

  const originalFetch = globalThis.fetch;

  try {
    // ----------------------------------------------------
    // Test 1: httpClient sends request to normalized URL & attaches token
    // ----------------------------------------------------
    console.log('1. httpClient Request & Headers Tests:');
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = '';

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = String(init?.body || '');

      return new Response(
        JSON.stringify({
          user: {
            id: 'admin-123',
            name: 'Portal Admin',
            identifier: 'admin@mastara.edu.et',
            role: 'ADMIN',
          },
          token: 'jwt-real-admin-token-xyz',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    httpClient.setToken('test-explicit-token-456');

    const result = await httpClient.post('/auth/admin/login', {
      identifier: 'admin@mastara.edu.et',
      password: 'password123',
    });

    assert(
      capturedUrl.endsWith('/api/v1/auth/admin/login'),
      'Normalizes endpoint with /api/v1 prefix',
      capturedUrl,
    );
    assert(
      capturedHeaders['Authorization'] === 'Bearer test-explicit-token-456',
      'Attaches Bearer token in Authorization header',
    );
    assert(
      capturedHeaders['Content-Type'] === 'application/json',
      'Sets Content-Type to application/json for object bodies',
    );
    assert(
      capturedBody.includes('admin@mastara.edu.et'),
      'Serializes request body payload correctly',
    );

    // ----------------------------------------------------
    // Test 2: realAdminAuthApi.login parses valid AdminAuthResult
    // ----------------------------------------------------
    console.log('\n2. realAdminAuthApi Integration Tests:');
    const authResult = await realAdminAuthApi.login({
      identifier: 'admin@mastara.edu.et',
      password: 'password123',
    });

    assert(authResult.user.id === 'admin-123', 'Parsed user ID accurately');
    assert(authResult.user.role === 'ADMIN', 'Conforms to adminUserSchema (role === ADMIN)');
    assert(authResult.token === 'jwt-real-admin-token-xyz', 'Contains valid token');
    assert(
      adminAuthResultSchema.safeParse(authResult).success,
      'Validates against Zod adminAuthResultSchema',
    );

    // ----------------------------------------------------
    // Test 3: Error Handling & Status Code Mapping
    // ----------------------------------------------------
    console.log('\n3. Error Translation Tests:');
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          errorCode: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    };

    let apiErrorThrown = false;
    let thrownCode = '';

    try {
      await httpClient.post('/auth/admin/login', {
        identifier: 'bad@mastara.edu.et',
        password: 'wrong',
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        apiErrorThrown = true;
        thrownCode = err.code;
      }
    }

    assert(apiErrorThrown, 'Throws typed ApiError on HTTP 401');
    assert(
      thrownCode === ADMIN_ERROR_CODES.UNAUTHORIZED,
      'Maps 401 to ADMIN_ERROR_CODES.UNAUTHORIZED',
    );

    // ----------------------------------------------------
    // Test 4: 204 No Content handling
    // ----------------------------------------------------
    globalThis.fetch = async () => {
      return new Response(null, { status: 204 });
    };

    const emptyResult = await httpClient.delete('/catalog/courses/test-id');
    assert(emptyResult === undefined, 'Handles HTTP 204 No Content without JSON parsing errors');

    // ----------------------------------------------------
    // Test 5: realDashboardApi.getSummary() Integration
    // ----------------------------------------------------
    console.log('\n4. realDashboardApi Integration Tests:');
    let dashboardEndpointCalled = '';
    globalThis.fetch = async (input) => {
      dashboardEndpointCalled = String(input);
      return new Response(
        JSON.stringify({
          activeStudents: 50,
          pendingPayments: 2,
          activeEntitlements: 35,
          expiringSoon: 4,
          newStudents: [
            { date: '2026-10-11', count: 10 },
            { date: '2026-10-12', count: 12 },
            { date: '2026-10-13', count: 15 },
            { date: '2026-10-14', count: 8 },
            { date: '2026-10-15', count: 20 },
            { date: '2026-10-16', count: 25 },
            { date: '2026-10-17', count: 30 },
          ],
          attention: {
            paymentsWaiting: 2,
            duplicateReferences: 0,
            scanJobsFailed: 0,
            contentInDraft: 5,
          },
          recentActivity: [
            {
              id: 'act-1',
              at: new Date().toISOString(),
              actor: 'ADMIN',
              action: 'PAYMENT_APPROVED',
              target: 'Order #1',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const dashboardSummary = await realDashboardApi.getSummary();
    assert(
      dashboardEndpointCalled.endsWith('/api/v1/dashboard/summary'),
      'realDashboardApi calls /dashboard/summary endpoint',
    );
    assert(dashboardSummary.activeStudents === 50, 'Parsed live KPI activeStudents accurately (50)');
    assert(dashboardSummary.newStudents.length === 7, 'Received full 7 days trend from backend');
    assert(dashboardSummary.attention.contentInDraft === 5, 'Attention panel draft count parsed (5)');

    console.log(`\n========================================`);
    console.log(`Frontend Network Tests: ${passed} passed, ${failed} failed.`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
    httpClient.setToken(null);
  }
}

runFrontendNetworkAuthTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
