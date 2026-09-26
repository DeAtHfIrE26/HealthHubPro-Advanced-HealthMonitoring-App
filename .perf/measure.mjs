/**
 * Performance baseline harness. Reports network waterfall, Web Vitals and
 * long tasks for the two most important entry points, plus API latency.
 * Run against the production build (vite preview + API on :5000).
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LABEL = process.env.LABEL ?? 'baseline';

const VITALS = `
window.__perf = { lcp: 0, cls: 0, longTasks: [], inp: 0 };
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
}).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
}).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) window.__perf.longTasks.push(Math.round(e.duration));
}).observe({ type: 'longtask', buffered: true });
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) window.__perf.inp = Math.max(window.__perf.inp, e.duration);
}).observe({ type: 'event', durationThreshold: 16, buffered: true });
`;

function track(page) {
  const reqs = [];
  const handler = async (r) => {
    const u = new URL(r.url());
    if (u.origin !== new URL(BASE).origin) return;
    let size = 0;
    try {
      size = (await r.body()).length;
    } catch {
      // A redirect or an aborted response has no retrievable body; 0 is right.
      size = 0;
    }
    const t = r.request().timing();
    reqs.push({
      path: u.pathname + (u.search || ''),
      type: r.request().resourceType(),
      status: r.status(),
      size,
      ms: t ? Math.round(t.responseEnd - t.requestStart) : null,
    });
  };
  page.on('response', handler);
  return { reqs, stop: () => page.off('response', handler) };
}

async function vitals(page) {
  // Settle: let animations and idle work finish before reading.
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = {};
    for (const p of performance.getEntriesByType('paint')) paints[p.name] = Math.round(p.startTime);
    return {
      ttfb: Math.round(nav.responseStart || 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      fcp: paints['first-contentful-paint'] ?? null,
      lcp: Math.round(window.__perf.lcp),
      cls: Number(window.__perf.cls.toFixed(4)),
      longTasks: window.__perf.longTasks.sort((a, b) => b - a),
      inp: Math.round(window.__perf.inp),
      jsHeapMB: performance.memory
        ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1)
        : null,
    };
  });
}

const out = { label: LABEL, at: new Date().toISOString(), scenarios: {} };
const browser = await chromium.launch({ executablePath: EXEC });

// ---- 1. Cold load of /login (a first-time visitor) -------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(VITALS);
  const t = track(page);
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByRole('button', { name: /try the demo/i }).waitFor();
  const v = await vitals(page);
  t.stop();
  out.scenarios.loginCold = { vitals: v, requests: t.reqs };
  await ctx.close();
}

// ---- 2. Cold load straight onto the dashboard (deep link, signed in) ------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: /try the demo/i }).click();
  await page.getByRole('heading', { name: /hello, demo/i }).waitFor();
  const state = await ctx.storageState();
  await ctx.close();

  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: state,
  });
  const page2 = await ctx2.newPage();
  await page2.addInitScript(VITALS);
  const t2 = track(page2);
  await page2.goto(`${BASE}/`, { waitUntil: 'load' });
  await page2.getByRole('heading', { name: /hello, demo/i }).waitFor();
  await page2
    .locator('.recharts-wrapper svg')
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const v2 = await vitals(page2);
  t2.stop();
  out.scenarios.dashboardCold = { vitals: v2, requests: t2.reqs };

  // ---- 3. Chart range switch (7d -> 30d): interaction cost --------------
  await page2.evaluate(() => {
    window.__perf.longTasks.length = 0;
    window.__perf.t0 = performance.now();
  });
  await page2.getByRole('button', { name: '30d' }).click();
  // Settle on the repaint rather than a fixed sleep, so the number is the
  // work the switch actually costs.
  const switchMs = await page2.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return Math.round(performance.now() - window.__perf.t0);
  });
  out.scenarios.chartRangeSwitch = {
    wallMs: switchMs,
    longTasks: await page2.evaluate(() => window.__perf.longTasks.sort((a, b) => b - a)),
    points: await page2
      .locator('.recharts-wrapper .recharts-line-dot, .recharts-wrapper .recharts-area-dot')
      .count(),
  };

  // ---- 4. Navigate to Settings (lazy route) ------------------------------
  const settleReqs = [];
  const assetHandler = (r) => {
    if (r.url().includes('/assets/')) settleReqs.push(new URL(r.url()).pathname);
  };
  page2.on('response', assetHandler);
  await page2.evaluate(() => {
    window.__perf.longTasks.length = 0;
  });
  const s0 = Date.now();
  await page2.goto(`${BASE}/settings`, { waitUntil: 'load' });
  await page2.getByRole('heading', { name: 'Settings', level: 1 }).waitFor();
  out.scenarios.settingsRoute = {
    wallMs: Date.now() - s0,
    chunks: settleReqs,
    longTasks: await page2.evaluate(() => window.__perf.longTasks.sort((a, b) => b - a)),
  };
  page2.off('response', assetHandler);
  await ctx2.close();
}

await browser.close();
writeFileSync(process.env.OUT ?? '.perf/baseline.json', JSON.stringify(out, null, 2));

// ---- Report ---------------------------------------------------------------
for (const [name, s] of Object.entries(out.scenarios)) {
  console.log(`\n### ${name}`);
  if (s.vitals) {
    const v = s.vitals;
    console.log(
      `  TTFB ${v.ttfb}ms  FCP ${v.fcp}ms  LCP ${v.lcp}ms  CLS ${v.cls}  load ${v.load}ms  heap ${v.jsHeapMB}MB`,
    );
    console.log(
      `  longTasks(ms): [${v.longTasks.join(', ')}]  total blocking ${v.longTasks.reduce((a, b) => a + b, 0)}ms`,
    );
  }
  if (s.requests) {
    const js = s.requests.filter((r) => r.type === 'script');
    const api = s.requests.filter((r) => r.path.startsWith('/api'));
    const total = s.requests.reduce((a, r) => a + r.size, 0);
    console.log(`  transferred ${(total / 1024).toFixed(1)} kB over ${s.requests.length} requests`);
    console.log(
      `  JS (${js.length}): ` +
        js
          .map((r) => `${r.path.replace('/assets/', '')} ${(r.size / 1024).toFixed(0)}kB`)
          .join(', '),
    );
    if (api.length)
      console.log(
        `  API (${api.length}): ` + api.map((r) => `${r.path} ${r.status} ${r.ms}ms`).join(', '),
      );
  }
  if (s.wallMs !== undefined)
    console.log(`  wall ${s.wallMs}ms  longTasks(ms): [${s.longTasks.join(', ')}]`);
  if (s.chunks) console.log(`  chunks fetched: ${s.chunks.join(', ') || 'none'}`);
}
