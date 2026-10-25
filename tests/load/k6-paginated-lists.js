// tests/load/k6-paginated-lists.js
// Load test: Paginated query endpoints under high throughput
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '1m', target: 80 },  // 80 virtual users browsing paginated lists
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of paginated list responses under 300ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';

export default function () {
  const page = Math.floor(Math.random() * 5) + 1;
  const pageSize = 10;

  const endpoints = [
    `${BASE_URL}/courses?page=${page}&pageSize=${pageSize}&stream=NATURAL`,
    `${BASE_URL}/students?page=${page}&pageSize=${pageSize}`,
    `${BASE_URL}/content/topics?page=${page}&pageSize=${pageSize}`,
    `${BASE_URL}/admin/payments?page=${page}&pageSize=${pageSize}`,
  ];

  for (const url of endpoints) {
    const res = http.get(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    check(res, {
      'paginated endpoint responds 200': (r) => r.status === 200,
      'has items array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.items || body);
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);
  }
}
