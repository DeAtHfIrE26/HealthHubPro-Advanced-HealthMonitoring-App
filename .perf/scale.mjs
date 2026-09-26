/**
 * Large-dataset behaviour: import 3 years of days, then measure the endpoints
 * whose cost scales with history size.
 */
const BASE = 'http://localhost:5000/api';
const u = `perf${Date.now().toString(36)}`;

const reg = await fetch(`${BASE}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: u,
    email: `${u}@example.com`,
    password: 'password123',
    firstName: 'Perf',
    lastName: 'User',
  }),
});
const cookie = (reg.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const H = { 'Content-Type': 'application/json', Cookie: cookie };

const DAYS = 1095;
const start = new Date(Date.now() - DAYS * 86400000);
const all = [];
for (let i = 0; i < DAYS; i += 1) {
  const d = new Date(start.getTime() + i * 86400000);
  all.push({
    date: d.toISOString().slice(0, 10),
    steps: 4000 + Math.round(Math.random() * 9000),
    calories: 300 + Math.round(Math.random() * 600),
    activeMinutes: 20 + Math.round(Math.random() * 70),
    sleepHours: Math.round((5 + Math.random() * 4) * 10) / 10,
    waterLiters: Math.round((1 + Math.random() * 2) * 10) / 10,
  });
}

const t0 = performance.now();
let batches = 0;
for (let i = 0; i < all.length; i += 400) {
  const r = await fetch(`${BASE}/import`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ days: all.slice(i, i + 400) }),
  });
  if (!r.ok) {
    console.log('import failed', r.status, await r.text());
    process.exit(1);
  }
  batches += 1;
}
console.log(
  `imported ${DAYS} days in ${batches} batches: ${(performance.now() - t0).toFixed(0)}ms total`,
);

async function time(path, n = 10) {
  const ts = [];
  let bytes = 0;
  for (let i = 0; i < n; i += 1) {
    const t = performance.now();
    const r = await fetch(BASE + path, { headers: { Cookie: cookie } });
    bytes = (await r.arrayBuffer()).byteLength;
    ts.push(performance.now() - t);
  }
  ts.sort((a, b) => a - b);
  return {
    p50: ts[Math.floor(n / 2)].toFixed(1),
    max: ts[n - 1].toFixed(1),
    kb: (bytes / 1024).toFixed(1),
  };
}

console.log('\nendpoint'.padEnd(37), 'p50'.padStart(8), 'max'.padStart(8), 'kB'.padStart(9));
for (const p of [
  '/activity/history?days=7',
  '/activity/history?days=30',
  '/insights',
  '/export',
  '/export?format=csv',
  '/challenges',
  '/challenges/1/leaderboard',
]) {
  const r = await time(p);
  console.log(p.padEnd(36), r.p50.padStart(8), r.max.padStart(8), r.kb.padStart(9));
}
console.log(`\nAccount: ${u} (${DAYS} days of history)`);
