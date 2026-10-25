// apps/mobile/src/modules/store/storeApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { realStoreApi } from './api/store.api';
import { httpClient } from '@/core/network';

test('store / commerce: real API client gets pricing, buyable courses and creates orders', async () => {
  const origGet = httpClient.get;
  const origPost = httpClient.post;
  let getCalls = 0;
  let postCalls = 0;

  (httpClient as any).get = async (path: string) => {
    getCalls += 1;
    if (path === '/commerce/pricing') {
      return {
        singleCoursePrice: 150,
        bundlePricePerCourse: 120,
        bundleMinCourses: 7,
        fullFreshmanSemesterPrice: 600,
        fullFreshmanYearPrice: 1000,
        bothStreamsFreshmanYearPrice: 1600,
        durationDays: {
          SINGLE: 120,
          BUNDLE: 120,
          FULL_SEMESTER: 180,
          FULL_STREAM: 365,
          FULL_BOTH: 365,
        },
        maxReceiptSizeBytes: 5242880,
      };
    }
    if (path.includes('/commerce/courses/buyable')) {
      return [
        {
          course: {
            id: 'c-math-1',
            semesterId: 'sem-1',
            code: 'MATH101',
            title: { en: 'Calculus I', am: 'ካልኩለስ 1' },
            stream: 'NATURAL',
          },
          access: 'LOCKED',
          daysLeft: 0,
          buyable: true,
        },
      ];
    }
    return null;
  };

  (httpClient as any).post = async (path: string, body: any) => {
    postCalls += 1;
    if (path === '/commerce/orders') {
      return {
        id: 'ord-123',
        type: body.type,
        stream: body.stream,
        items: [{ courseId: 'c-math-1' }],
        method: body.method,
        reference: body.reference,
        quotedAmount: 150,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        durationDays: 120,
      };
    }
    return null;
  };

  try {
    const pricing = await realStoreApi.getPricing();
    assert.equal(pricing.singleCoursePrice, 150);

    const buyable = await realStoreApi.getBuyableCourses('sem-1', 'NATURAL');
    assert.equal(buyable.length, 1);
    assert.equal(buyable[0]?.course.id, 'c-math-1');
    assert.equal(buyable[0]?.access, 'LOCKED');
    assert.equal(buyable[0]?.buyable, true);

    const order = await realStoreApi.createOrder(
      'user-1',
      {
        type: 'SINGLE',
        stream: 'NATURAL',
        courseIds: ['c-math-1'],
        method: 'TELEBIRR',
        reference: 'TX12345678',
      },
      1024,
    );
    assert.equal(order.id, 'ord-123');
    assert.equal(order.status, 'PENDING');
    assert.equal(order.amount, 150);

    assert.equal(getCalls, 2);
    assert.equal(postCalls, 1);
  } finally {
    httpClient.get = origGet;
    httpClient.post = origPost;
  }
});
