// tests/load/k6-payment-queue.js
// Load test: Payment submission and admin queue processing under concurrent load
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 concurrent users
    { duration: '1m', target: 50 },   // Peak load: 50 concurrent payment submissions
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of payment submissions must respond within 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';

export default function () {
  const studentId = `MS${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const reference = `TB${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // 1. Student submits payment order
  const payload = JSON.stringify({
    studentId,
    productId: 'bundle-freshman-sem1',
    paymentMethod: 'TELEBIRR',
    transactionReference: reference,
    amount: 350,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const submitRes = http.post(`${BASE_URL}/payments/submit`, payload, params);

  check(submitRes, {
    'payment submitted successfully': (r) => r.status === 201 || r.status === 200,
  });

  sleep(1);

  // 2. Admin polls payment queue (simulating finance operators reviewing transactions)
  const queueRes = http.get(`${BASE_URL}/admin/payments?status=PENDING&page=1&pageSize=20`, params);

  check(queueRes, {
    'payment queue listed successfully': (r) => r.status === 200,
    'payment queue response contains items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items || body);
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
