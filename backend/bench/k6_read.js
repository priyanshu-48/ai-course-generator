// k6 load test: GET /ping/ and GET /api/courses/ (empty list, real Mongo) with N virtual users.
// Usage: k6 run -e BASE=http://host:8000 -e VUS=20 -e DUR=20s --summary-export=out.json k6_read.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DUR || '20s',
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export default function () {
  const r1 = http.get(`${__ENV.BASE}/ping/`);
  const r2 = http.get(`${__ENV.BASE}/api/courses/`, { headers: { 'X-Demo-User': 'k6' } });
  check(r1, { ping_ok: (r) => r.status === 200 });
  check(r2, { list_ok: (r) => r.status === 200 });
}
