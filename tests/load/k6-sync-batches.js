// tests/load/k6-sync-batches.js
// Load test: Student offline outbox batch sync under peak campus load
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '1m', target: 100 },  // Peak load: 100 concurrent sync uploads
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<750'], // 95% of batch syncs under 750ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';

export default function () {
  const studentId = `MS${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const syncBatchId = `batch-${Date.now()}-${__VU}-${__ITER}`;

  // Batch payload containing completed offline exam sitting and chapter reading logs
  const payload = JSON.stringify({
    syncBatchId,
    studentId,
    changes: [
      {
        id: `change-exam-${Date.now()}`,
        kind: 'EXAM_SUBMISSION',
        examId: 'mid-exam-math-2025',
        score: 18,
        totalQuestions: 20,
        completedAt: new Date().toISOString(),
      },
      {
        id: `change-progress-${Date.now()}`,
        kind: 'TOPIC_PROGRESS',
        topicId: 'topic-calculus-ch1',
        completed: true,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/sync/batches`, payload, params);

  check(res, {
    'sync batch accepted': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
