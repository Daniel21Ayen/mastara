import {
  adminPaymentSchema,
  paymentListResultSchema,
} from '@mastara/contracts';
import { httpClient } from '../src/core/network/httpClient';
import { realPaymentsApi } from '../src/modules/payments/api/payments.api';

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

async function runPaymentsApiTests() {
  console.log('=== Testing realPaymentsApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockPaymentData = {
      id: 'proof-uuid-1',
      studentId: 'student-uuid-1',
      studentName: 'Abebe Kebede',
      universityShortName: 'AAU',
      type: 'BUNDLE',
      stream: 'NATURAL',
      courses: [
        { courseId: 'c-1', code: 'MATH101', title: 'Calculus I' },
        { courseId: 'c-2', code: 'PHYS101', title: 'General Physics' },
      ],
      amount: 450,
      method: 'CBE_MOBILE',
      reference: 'FT24001',
      status: 'PENDING',
      rejectReason: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
      durationDays: 120,
      duplicateOf: null,
    };

    const mockListResultData = {
      items: [mockPaymentData],
      total: 1,
      page: 1,
      pageCount: 1,
      counts: {
        pending: 1,
        approved: 5,
        rejected: 2,
      },
    };

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || 'GET';
      capturedBody = String(init?.body || '');

      if (capturedUrl.includes('/commerce/payments/proof-uuid-1/decide')) {
        const body = JSON.parse(capturedBody);
        return new Response(
          JSON.stringify({
            ...mockPaymentData,
            status: body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            rejectReason: body.reason ?? null,
            decidedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (capturedUrl.includes('/commerce/payments/proof-uuid-1')) {
        return new Response(JSON.stringify(mockPaymentData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(mockListResultData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    httpClient.setToken('admin-session-token');

    // 1. Test list
    const listResponse = await realPaymentsApi.list({
      status: 'PENDING',
      method: 'CBE_MOBILE',
      q: 'Abebe',
      page: 1,
    });
    assert(capturedMethod === 'GET', 'list sends GET request');
    assert(
      capturedUrl.includes('/api/v1/commerce/payments?status=PENDING&method=CBE_MOBILE&q=Abebe&page=1'),
      'list formats query parameters correctly',
    );
    assert(listResponse.items.length === 1, 'list returns 1 item');
    assert(listResponse.counts.pending === 1, 'counts.pending is 1');
    assert(paymentListResultSchema.safeParse(listResponse).success, 'Validated against paymentListResultSchema');

    // 2. Test get
    const getResponse = await realPaymentsApi.get('proof-uuid-1');
    assert(capturedMethod === 'GET', 'get sends GET request');
    assert(capturedUrl.includes('/api/v1/commerce/payments/proof-uuid-1'), 'get calls /commerce/payments/:id');
    assert(getResponse.id === 'proof-uuid-1', 'get returns requested payment');
    assert(adminPaymentSchema.safeParse(getResponse).success, 'Validated against adminPaymentSchema');

    // 3. Test decide APPROVE
    const approveResponse = await realPaymentsApi.decide('proof-uuid-1', {
      action: 'APPROVE',
    });
    assert(capturedMethod === 'POST', 'decide sends POST request');
    assert(
      capturedUrl.includes('/api/v1/commerce/payments/proof-uuid-1/decide'),
      'decide calls /commerce/payments/:id/decide',
    );
    assert(approveResponse.status === 'APPROVED', 'decide APPROVE returned status APPROVED');
    assert(adminPaymentSchema.safeParse(approveResponse).success, 'Validated approve response schema');

    // 4. Test decide REJECT
    const rejectResponse = await realPaymentsApi.decide('proof-uuid-1', {
      action: 'REJECT',
      reason: 'MISMATCH',
    });
    assert(rejectResponse.status === 'REJECTED', 'decide REJECT returned status REJECTED');
    assert(rejectResponse.rejectReason === 'MISMATCH', 'rejectReason is MISMATCH');
    assert(adminPaymentSchema.safeParse(rejectResponse).success, 'Validated reject response schema');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runPaymentsApiTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
