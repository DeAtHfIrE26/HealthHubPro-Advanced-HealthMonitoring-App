/**
 * Per-endpoint latency against the running API, measured in isolation so one
 * endpoint's cost is not hidden behind another's concurrency.
 */
const BASE = 'http://localhost:5000/api';
const N = 30;

async function login() {
  const r = await fetch(`${BASE}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}

const cookie = await login();
const endpoints = [
  'GET /health',
  'GET /auth/me',
  'GET /activity',
  'GET /activity/history?days=7',
  'GET /activity/history?days=14',
  'GET /activity/history?days=30',
  'GET /activity/history?days=365',
  'GET /goals',
  'GET /workouts',
  'GET /sessions?limit=5',
  'GET /challenges',
  'GET /challenges/1/leaderboard',
  'GET /insights',
  'GET /export',
  'GET /export?format=csv',
];

console.log(
  'endpoint'.padEnd(36),
  'p50'.padStart(7),
  'p95'.padStart(7),
  'max'.padStart(7),
  'bytes'.padStart(9),
);
for (const ep of endpoints) {
  const [, path] = ep.split(' ');
  const times = [];
  let bytes = 0;
  for (let i = 0; i < N; i += 1) {
    const t = performance.now();
    const res = await fetch(BASE + path, { headers: { Cookie: cookie } });
    const body = await res.arrayBuffer();
    times.push(performance.now() - t);
    bytes = body.byteLength;
  }
  times.sort((a, b) => a - b);
  const q = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))].toFixed(1);
  console.log(
    ep.padEnd(36),
    q(0.5).padStart(7),
    q(0.95).padStart(7),
    times[times.length - 1].toFixed(1).padStart(7),
    String(bytes).padStart(9),
  );
}
