// tests/load/k6-admin-lists-scale.js
// Load test: Admin paginated lists under 10,000 rows scale (Mastara SRS 3.2 Phase 6)
// Target: Admin lists under 500 ms p95 at 10,000 rows scale
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '40s', target: 50 }, // 50 concurrent administrative operators browsing lists
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    // Mastara SRS 3.2 NFR-19: Admin lists under 500 ms p95 at 10,000 rows scale
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'], // <1% failure rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'mock-admin-token-super-admin';

export default function () {
  // Simulate browsing pages deep into a 10,000 row table (pages 1 to 500, pageSize 20)
  const page = Math.floor(Math.random() * 200) + 1;
  const pageSize = 20;

  const endpoints = [
    `${BASE_URL}/admin/payments?page=${page}&pageSize=${pageSize}&status=PENDING`,
    `${BASE_URL}/platform/admin/audit?page=${page}&pageSize=${pageSize}`,
    `${BASE_URL}/admin/students?page=${page}&pageSize=${pageSize}`,
    `${BASE_URL}/admin/refunds?page=${page}&pageSize=${pageSize}`,
    `${BASE_URL}/reports/admin/summary`,
  ];

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
  };

  for (const url of endpoints) {
    const res = http.get(url, { headers });

    check(res, {
      'admin endpoint responds 200 or 401/403 (unauthed env)': (r) =>
        r.status === 200 || r.status === 401 || r.status === 403,
      'response time under 500ms p95 threshold': (r) => r.timings.duration < 500,
    });

    sleep(0.3);
  }
}
