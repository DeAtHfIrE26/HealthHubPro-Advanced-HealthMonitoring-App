/** Module-load + first-request cost, i.e. what a Vercel cold start pays. */
const t0 = performance.now();
const { createApp } = await import('../server/app.js');
const tImport = performance.now() - t0;

const t1 = performance.now();
const app = createApp();
const tCreate = performance.now() - t1;

// First request also resolves storage (seeding on MemoryStorage).
const request = (await import('supertest')).default;
const t2 = performance.now();
await request(app).get('/api/health');
const tFirst = performance.now() - t2;

const t3 = performance.now();
await request(app).get('/api/health');
const tWarm = performance.now() - t3;

console.log(`module import   ${tImport.toFixed(0)}ms`);
console.log(`createApp()     ${tCreate.toFixed(0)}ms`);
console.log(`first request   ${tFirst.toFixed(0)}ms  (includes storage init + seed)`);
console.log(`warm request    ${tWarm.toFixed(1)}ms`);
console.log(
  `--- cold total  ${(tImport + tCreate + tFirst).toFixed(0)}ms (JS only; excludes Vercel sandbox boot)`,
);
