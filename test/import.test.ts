/**
 * Import correctness.
 *
 * The merge strategy decides whether an import can silently destroy data the
 * user typed in by hand, so it gets the most attention here.
 */
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { importRequestSchema, dateRange, metricsPresent } from '../shared/import.js';
import { createApp } from '../server/app.js';
import { setStorageForTesting } from '../server/storage/index.js';
import { MemoryStorage, rangeOf, resolveMerge } from '../server/storage/memory.js';
import { todayIso } from '../server/storage/seed.js';

let app: Express;

async function signUp(username: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      username,
      email: `${username}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    });
  expect(res.status).toBe(201);
  const cookies = res.headers['set-cookie'];
  return (Array.isArray(cookies) ? cookies : [cookies]).map((c) => c.split(';')[0]).join('; ');
}

beforeEach(async () => {
  const storage = new MemoryStorage();
  await storage.init();
  setStorageForTesting(storage);
  app = createApp();
});

describe('importRequestSchema', () => {
  it('accepts a minimal day', () => {
    const parsed = importRequestSchema.parse({ days: [{ date: '2026-09-20', steps: 100 }] });
    expect(parsed.strategy).toBe('merge');
  });

  it('defaults the strategy to the non-destructive one', () => {
    expect(importRequestSchema.parse({ days: [{ date: '2026-09-20', steps: 1 }] }).strategy).toBe(
      'merge',
    );
  });

  it('rejects an empty batch', () => {
    expect(importRequestSchema.safeParse({ days: [] }).success).toBe(false);
  });

  it('rejects more than the per-request cap', () => {
    const days = Array.from({ length: 401 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      steps: 1,
    }));
    expect(importRequestSchema.safeParse({ days }).success).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    expect(
      importRequestSchema.safeParse({ days: [{ date: '2026-02-31', steps: 1 }] }).success,
    ).toBe(false);
  });

  it('rejects unknown keys so a typo cannot be silently ignored', () => {
    expect(
      importRequestSchema.safeParse({ days: [{ date: '2026-09-20', stpes: 100 }] }).success,
    ).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(
      importRequestSchema.safeParse({ days: [{ date: '2026-09-20', sleepHours: 25 }] }).success,
    ).toBe(false);
  });
});

describe('resolveMerge', () => {
  const existing = {
    steps: 5000,
    calories: 0,
    activeMinutes: 0,
    sleepHours: 7.5,
    waterLiters: 0,
  };

  it('merge never overwrites a metric that already has a value', () => {
    const patch = resolveMerge(existing, { steps: 9999, calories: 400 }, 'merge');
    expect(patch.steps).toBeUndefined();
    expect(patch.calories).toBe(400);
  });

  it('merge fills metrics sitting at zero', () => {
    const patch = resolveMerge(existing, { activeMinutes: 45, waterLiters: 2 }, 'merge');
    expect(patch).toEqual({ activeMinutes: 45, waterLiters: 2 });
  });

  it('overwrite replaces everything provided', () => {
    const patch = resolveMerge(existing, { steps: 9999, sleepHours: 6 }, 'overwrite');
    expect(patch).toEqual({ steps: 9999, sleepHours: 6 });
  });

  it('produces no patch when values already match', () => {
    expect(resolveMerge(existing, { steps: 5000 }, 'overwrite')).toEqual({});
  });

  it('ignores metrics the file did not contain', () => {
    expect(resolveMerge(existing, {}, 'overwrite')).toEqual({});
  });

  it('treats zero as a real value under overwrite', () => {
    expect(resolveMerge(existing, { steps: 0 }, 'overwrite')).toEqual({ steps: 0 });
  });
});

describe('rangeOf', () => {
  it('returns null for nothing', () => {
    expect(rangeOf([])).toBeNull();
  });

  it('finds the bounds regardless of input order', () => {
    expect(rangeOf(['2026-03-02', '2026-01-01', '2026-02-05'])).toEqual({
      from: '2026-01-01',
      to: '2026-03-02',
    });
  });
});

describe('preview helpers', () => {
  it('reports only the metrics actually present', () => {
    expect(metricsPresent([{ date: '2026-09-20', steps: 1 }])).toEqual(['steps']);
    expect(metricsPresent([])).toEqual([]);
  });

  it('computes the date range for a preview', () => {
    expect(dateRange([{ date: '2026-09-20' }, { date: '2026-01-01' }])).toEqual({
      from: '2026-01-01',
      to: '2026-09-20',
    });
  });
});

describe('POST /api/import', () => {
  it('requires a session', async () => {
    const res = await request(app)
      .post('/api/import')
      .send({ days: [{ date: '2026-09-20', steps: 1 }] });
    expect(res.status).toBe(401);
  });

  it('creates days that did not exist', async () => {
    const cookie = await signUp('importer');
    const res = await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({
        days: [
          { date: '2026-01-01', steps: 8000 },
          { date: '2026-01-02', steps: 9000 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({ created: 2, updated: 0, skipped: 0 });
    expect(res.body.result.range).toEqual({ from: '2026-01-01', to: '2026-01-02' });
  });

  it('does not clobber a hand-logged value under merge', async () => {
    const cookie = await signUp('merger');
    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 12_345 });

    const today = todayIso();
    const res = await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: today, steps: 1, calories: 500 }], strategy: 'merge' });

    expect(res.status).toBe(200);
    const after = await request(app).get('/api/activity').set('Cookie', cookie);
    // Steps were already set, so the import must leave them alone...
    expect(after.body.activity.steps).toBe(12_345);
    // ...but calories were empty, so they get filled.
    expect(after.body.activity.calories).toBe(500);
  });

  it('replaces a hand-logged value under overwrite', async () => {
    const cookie = await signUp('overwriter');
    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 12_345 });

    const today = todayIso();
    await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: today, steps: 1 }], strategy: 'overwrite' });

    const after = await request(app).get('/api/activity').set('Cookie', cookie);
    expect(after.body.activity.steps).toBe(1);
  });

  it('counts an unchanged day as skipped rather than updated', async () => {
    const cookie = await signUp('skipper');
    await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: '2026-02-02', steps: 500 }] });

    const second = await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: '2026-02-02', steps: 500 }], strategy: 'overwrite' });

    expect(second.body.result).toMatchObject({ created: 0, updated: 0, skipped: 1 });
  });

  it('imported days show up in the history series', async () => {
    const cookie = await signUp('historian');
    const today = todayIso();
    await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: today, steps: 4242 }] });

    const res = await request(app).get('/api/activity/history?days=1').set('Cookie', cookie);
    expect(res.body.history[0].steps).toBe(4242);
  });

  it('rejects a malformed batch with 400', async () => {
    const cookie = await signUp('badbatch');
    const res = await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: 'yesterday', steps: 1 }] });
    expect(res.status).toBe(400);
  });

  it('only writes to the signed-in user', async () => {
    const a = await signUp('userone');
    const b = await signUp('usertwo');

    await request(app)
      .post('/api/import')
      .set('Cookie', a)
      .send({ days: [{ date: '2026-03-03', steps: 7777 }] });

    const other = await request(app).get('/api/activity?date=2026-03-03').set('Cookie', b);
    expect(other.body.activity.steps).toBe(0);
  });
});

describe('GET /api/export', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/export')).status).toBe(401);
  });

  it('returns JSON with every section and no password hash', async () => {
    const cookie = await signUp('exporter');
    const res = await request(app).get('/api/export').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');

    const body = JSON.parse(res.text);
    expect(body.profile.username).toBe('exporter');
    expect(body.goals).toHaveLength(5);
    expect(Array.isArray(body.activity)).toBe(true);
    expect(res.text).not.toContain('passwordHash');
    expect(res.text).not.toContain('$2');
  });

  it('round-trips: imported data comes back out', async () => {
    const cookie = await signUp('roundtrip');
    await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({ days: [{ date: '2026-04-04', steps: 1234, sleepHours: 7.5 }] });

    const res = await request(app).get('/api/export').set('Cookie', cookie);
    const day = JSON.parse(res.text).activity.find(
      (a: { date: string }) => a.date === '2026-04-04',
    );
    expect(day.steps).toBe(1234);
    expect(day.sleepHours).toBe(7.5);
  });

  it('returns CSV with a header and one row per day', async () => {
    const cookie = await signUp('csvexport');
    await request(app)
      .post('/api/import')
      .set('Cookie', cookie)
      .send({
        days: [
          { date: '2026-05-01', steps: 100 },
          { date: '2026-05-02', steps: 200 },
        ],
      });

    const res = await request(app).get('/api/export?format=csv').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('date,steps,calories,activeMinutes,sleepHours,waterLiters');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('2026-05-01,100');
  });

  it('rejects an unknown format', async () => {
    const cookie = await signUp('badformat');
    const res = await request(app).get('/api/export?format=pdf').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });
});
