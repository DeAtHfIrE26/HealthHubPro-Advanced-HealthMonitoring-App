/**
 * The same two entry points under throttling, because localhost hides the
 * whole problem: an unthrottled LCP of 200ms says nothing about a phone.
 * Fast 3G + 4x CPU is the Lighthouse "mobile" default.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const VITALS = `
window.__perf = { lcp: 0, cls: 0, longTasks: [] };
new PerformanceObserver((l)=>{for(const e of l.getEntries())window.__perf.lcp=e.startTime;})
  .observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver((l)=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__perf.cls+=e.value;})
  .observe({type:'layout-shift',buffered:true});
new PerformanceObserver((l)=>{for(const e of l.getEntries())window.__perf.longTasks.push(Math.round(e.duration));})
  .observe({type:'longtask',buffered:true});
`;

async function throttle(
  page,
  { cpu = 4, down = (1.6 * 1024 * 1024) / 8, up = (750 * 1024) / 8, rtt = 150 } = {},
) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: down,
    uploadThroughput: up,
    latency: rtt,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  return cdp;
}

async function read(page) {
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcp = performance
      .getEntriesByType('paint')
      .find((p) => p.name === 'first-contentful-paint');
    const lt = window.__perf.longTasks.sort((a, b) => b - a);
    return {
      ttfb: Math.round(nav.responseStart || 0),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: Math.round(window.__perf.lcp),
      cls: Number(window.__perf.cls.toFixed(4)),
      load: Math.round(nav.loadEventEnd || 0),
      longTasks: lt,
      tbt: lt.reduce((a, b) => a + Math.max(0, b - 50), 0),
    };
  });
}

const browser = await chromium.launch({ executablePath: EXEC });
const results = {};

// Signed-out first paint, mobile viewport.
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.addInitScript(VITALS);
  await throttle(page);
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 90000 });
  results['login (390px, Fast 3G, 4x CPU)'] = await read(page);
  await ctx.close();
}

// Signed-in dashboard, mobile viewport.
{
  const warm = await browser.newContext();
  const wp = await warm.newPage();
  await wp.goto(`${BASE}/login`);
  await wp.getByRole('button', { name: /try the demo/i }).click();
  await wp.getByRole('heading', { name: /hello, demo/i }).waitFor();
  const state = await warm.storageState();
  await warm.close();

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    storageState: state,
  });
  const page = await ctx.newPage();
  await page.addInitScript(VITALS);
  await throttle(page);
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 90000 });
  await page.getByRole('heading', { name: /hello, demo/i }).waitFor({ timeout: 60000 });
  results['dashboard (390px, Fast 3G, 4x CPU)'] = await read(page);
  await ctx.close();
}

await browser.close();
for (const [k, v] of Object.entries(results)) {
  console.log(`\n### ${k}`);
  console.log(`  TTFB ${v.ttfb}ms  FCP ${v.fcp}ms  LCP ${v.lcp}ms  CLS ${v.cls}  load ${v.load}ms`);
  console.log(`  TBT ${v.tbt}ms  longTasks(ms): [${v.longTasks.join(', ')}]`);
  const verdict = v.lcp < 2500 ? 'PASS' : 'FAIL';
  console.log(`  LCP target <2500ms: ${verdict} (${v.lcp}ms)`);
}
