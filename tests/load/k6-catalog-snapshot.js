// tests/load/k6-catalog-snapshot.js
// Load test: Catalog metadata snapshot endpoint under high student concurrency
// Validates 304 ETag caching, delta queries, and Redis/Postgres performance.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '1m', target: 100 },  // 100 virtual users syncing catalog simultaneously
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of snapshot requests under 200ms
    http_req_failed: ['rate<0.01'],    // Error rate strictly under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';

export default function () {
  // Scenario 1: Fresh Full Snapshot Request (Cold sync)
  const fullRes = http.get(`${BASE_URL}/catalog/snapshot?page=1&limit=500`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  const fullOk = check(fullRes, {
    'full snapshot responds 200': (r) => r.status === 200,
    'full snapshot has ETag': (r) => Boolean(r.headers['Etag'] || r.headers['etag']),
    'full snapshot contains items array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch {
        return false;
      }
    },
  });

  const etag = fullRes.headers['Etag'] || fullRes.headers['etag'];

  sleep(0.3);

  // Scenario 2: Conditional Sync with If-None-Match (Warm sync, 304 Not Modified)
  if (etag) {
    const cachedRes = http.get(`${BASE_URL}/catalog/snapshot?page=1&limit=500`, {
      headers: {
        'Accept': 'application/json',
        'If-None-Match': etag,
      },
    });

    check(cachedRes, {
      'cached snapshot responds 304 Not Modified': (r) => r.status === 304,
      '304 response has empty body': (r) => !r.body || r.body.length === 0,
    });
  }

  sleep(0.3);

  // Scenario 3: Delta Snapshot with `since` parameter
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const deltaRes = http.get(`${BASE_URL}/catalog/snapshot?since=${encodeURIComponent(fiveMinutesAgo)}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  check(deltaRes, {
    'delta snapshot responds 200': (r) => r.status === 200,
    'delta snapshot returns items and deletedIds': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items) && Array.isArray(body.deletedIds);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
