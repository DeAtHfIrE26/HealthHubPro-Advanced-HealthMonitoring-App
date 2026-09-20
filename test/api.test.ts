/**
 * Integration coverage for every API route.
 *
 * Runs the real Express app against MemoryStorage. The storage seam means
 * the same suite runs against Postgres when DATABASE_URL is set (see
 * test/postgres.test.ts).
 */
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { setStorageForTesting } from '../server/storage/index.js';
import { MemoryStorage } from '../server/storage/memory.js';
import { DEMO_PASSWORD, DEMO_USERNAME, addDays, todayIso } from '../server/storage/seed.js';

let app: Express;

/** Signs in and returns the cookie header for subsequent requests. */
async function signInAsDemo(): Promise<string> {
  const res = await request(app).post('/api/auth/demo').send();
  const cookies = res.headers['set-cookie'];
  expect(cookies).toBeDefined();
  return (Array.isArray(cookies) ? cookies : [cookies]).map((c) => c.split(';')[0]).join('; ');
}

async function registerFresh(username: string): Promise<string> {
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

describe('GET /api/health', () => {
  it('reports status and whether storage persists', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.persistent).toBe(false);
  });
});

describe('unknown endpoints', () => {
  it('returns a JSON 404 rather than HTML', async () => {
    const res = await request(app).get('/api/not-a-real-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/auth/register', () => {
  it('creates an account, sets a session and returns the user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('newuser');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'nohash',
      email: 'nohash@example.com',
      password: 'password123',
      firstName: 'No',
      lastName: 'Hash',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('$2');
  });

  it('gives the new user a full set of starting goals', async () => {
    const cookie = await registerFresh('goaluser');
    const res = await request(app).get('/api/goals').set('Cookie', cookie);
    expect(res.body.goals).toHaveLength(5);
  });

  it('rejects a duplicate username with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: DEMO_USERNAME,
      email: 'other@example.com',
      password: 'password123',
      firstName: 'Dup',
      lastName: 'User',
    });
    expect(res.status).toBe(409);
    expect(res.body.details.fieldErrors.username).toBeDefined();
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'uniquename',
      email: 'demo@healthhubpro.app',
      password: 'password123',
      firstName: 'Dup',
      lastName: 'Email',
    });
    expect(res.status).toBe(409);
    expect(res.body.details.fieldErrors.email).toBeDefined();
  });

  it('rejects invalid input with field-level errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a', email: 'nope', password: 'x', firstName: '', lastName: '' });
    expect(res.status).toBe(400);
    expect(res.body.details.fieldErrors.username).toBeDefined();
    expect(res.body.details.fieldErrors.email).toBeDefined();
    expect(res.body.details.fieldErrors.password).toBeDefined();
  });

  it('treats usernames case-insensitively when checking duplicates', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: DEMO_USERNAME.toUpperCase(),
      email: 'caps@example.com',
      password: 'password123',
      firstName: 'Caps',
      lastName: 'User',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(DEMO_USERNAME);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('gives an identical response for unknown user and wrong password', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'whatever' });
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: 'whatever' });
    // Must not leak which usernames exist.
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body.error).toBe(wrong.body.error);
  });

  it('rejects a missing field with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: DEMO_USERNAME });
    expect(res.status).toBe(400);
  });
});

describe('session lifecycle', () => {
  it('reports null user when signed out, without erroring', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('reports the user when signed in', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.body.user.username).toBe(DEMO_USERNAME);
  });

  it('clears the session on logout', async () => {
    const cookie = await signInAsDemo();
    await request(app).post('/api/auth/logout').set('Cookie', cookie).send();
    const res = await request(app).get('/api/auth/me');
    expect(res.body.user).toBeNull();
  });

  it('ignores a forged, unsigned session cookie', async () => {
    // The cookie is signed; a hand-written one must not authenticate.
    const res = await request(app).get('/api/auth/me').set('Cookie', 'hhp_session=1');
    expect(res.body.user).toBeNull();
  });

  it('ignores a cookie with a tampered signature', async () => {
    const cookie = await signInAsDemo();
    const tampered = cookie.replace(/.$/, 'X');
    const res = await request(app).get('/api/auth/me').set('Cookie', tampered);
    expect(res.body.user).toBeNull();
  });
});

describe('authorisation', () => {
  it.each([
    ['get', '/api/goals'],
    ['get', '/api/activity'],
    ['get', '/api/activity/history'],
    ['get', '/api/sessions'],
    ['get', '/api/challenges'],
    ['get', '/api/insights'],
    ['put', '/api/activity'],
    ['put', '/api/goals'],
    ['post', '/api/sessions'],
    ['patch', '/api/users/me'],
  ])('rejects %s %s without a session', async (method, path) => {
    const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
      method
    ]!(path).send({});
    expect(res.status).toBe(401);
  });
});

describe('CSRF surface', () => {
  it('rejects a form-encoded mutation', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .type('form')
      .send('username=demo&password=demo1234');
    expect(res.status).toBe(415);
  });

  it('allows a bodyless JSON mutation', async () => {
    const res = await request(app).post('/api/auth/demo').send();
    expect(res.status).toBe(200);
  });
});

describe('activity', () => {
  it('returns a zero-filled row for a day with no data', async () => {
    const cookie = await registerFresh('activityuser');
    const res = await request(app).get('/api/activity').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.activity.steps).toBe(0);
    expect(res.body.activity.date).toBe(todayIso());
  });

  it('saves and reads back a metric', async () => {
    const cookie = await signInAsDemo();
    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 12_345 });
    const res = await request(app).get('/api/activity').set('Cookie', cookie);
    expect(res.body.activity.steps).toBe(12_345);
  });

  it('merges a partial update instead of wiping other metrics', async () => {
    const cookie = await signInAsDemo();
    await request(app)
      .put('/api/activity')
      .set('Cookie', cookie)
      .send({ steps: 1000, calories: 200 });
    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 2000 });
    const res = await request(app).get('/api/activity').set('Cookie', cookie);
    expect(res.body.activity.steps).toBe(2000);
    expect(res.body.activity.calories).toBe(200);
  });

  it('rejects a negative metric', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: -1 });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown field', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .put('/api/activity')
      .set('Cookie', cookie)
      .send({ steps: 10, isAdmin: true });
    expect(res.status).toBe(400);
  });

  it('rejects a malformed date', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/activity?date=2026-02-31').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('writes to an explicit past date without touching today', async () => {
    const cookie = await registerFresh('backfiller');
    const past = addDays(todayIso(), -3);

    await request(app).put('/api/activity').set('Cookie', cookie).send({ date: past, steps: 6100 });

    const back = await request(app).get(`/api/activity?date=${past}`).set('Cookie', cookie);
    expect(back.body.activity.steps).toBe(6100);

    const today = await request(app).get('/api/activity').set('Cookie', cookie);
    expect(today.body.activity.steps).toBe(0);
  });

  it('refuses to record a day that has not happened', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .put('/api/activity')
      .set('Cookie', cookie)
      .send({ date: addDays(todayIso(), 5), steps: 10_000 });
    expect(res.status).toBe(400);
  });

  it('still accepts tomorrow, because a user east of UTC is already living it', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .put('/api/activity')
      .set('Cookie', cookie)
      .send({ date: addDays(todayIso(), 1), steps: 10 });
    expect(res.status).toBe(200);
  });

  it('returns exactly the requested number of history days, oldest first', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/activity/history?days=10').set('Cookie', cookie);
    expect(res.body.history).toHaveLength(10);
    const dates = res.body.history.map((h: { date: string }) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('defaults to 7 days and clamps an out-of-range request', async () => {
    const cookie = await signInAsDemo();
    expect(
      (await request(app).get('/api/activity/history').set('Cookie', cookie)).body.history,
    ).toHaveLength(7);
    const tooMany = await request(app).get('/api/activity/history?days=500').set('Cookie', cookie);
    expect(tooMany.status).toBe(400);
  });
});

describe('goals', () => {
  it('returns goals with today progress attached', async () => {
    const cookie = await signInAsDemo();
    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 5000 });
    const res = await request(app).get('/api/goals').set('Cookie', cookie);
    const steps = res.body.goals.find((g: { type: string }) => g.type === 'steps');
    expect(steps.current).toBe(5000);
    expect(steps.percent).toBe(50);
  });

  it('caps percent at 100 when the goal is exceeded', async () => {
    const cookie = await signInAsDemo();
    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 50_000 });
    const res = await request(app).get('/api/goals').set('Cookie', cookie);
    const steps = res.body.goals.find((g: { type: string }) => g.type === 'steps');
    expect(steps.percent).toBe(100);
  });

  it('updates an existing goal rather than duplicating it', async () => {
    const cookie = await signInAsDemo();
    const before = (await request(app).get('/api/goals').set('Cookie', cookie)).body.goals.length;
    await request(app)
      .put('/api/goals')
      .set('Cookie', cookie)
      .send({ type: 'steps', target: 15_000 });
    const after = await request(app).get('/api/goals').set('Cookie', cookie);
    expect(after.body.goals).toHaveLength(before);
    expect(after.body.goals.find((g: { type: string }) => g.type === 'steps').target).toBe(15_000);
  });

  it('rejects an unknown goal type', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .put('/api/goals')
      .set('Cookie', cookie)
      .send({ type: 'vibes', target: 5 });
    expect(res.status).toBe(400);
  });
});

describe('workouts', () => {
  it('lists the catalogue without a session', async () => {
    const res = await request(app).get('/api/workouts');
    expect(res.status).toBe(200);
    expect(res.body.workouts.length).toBeGreaterThan(0);
  });

  it('filters by type', async () => {
    const res = await request(app).get('/api/workouts?type=yoga');
    expect(res.body.workouts.every((w: { type: string }) => w.type === 'yoga')).toBe(true);
  });

  it('filters by difficulty', async () => {
    const res = await request(app).get('/api/workouts?difficulty=advanced');
    expect(
      res.body.workouts.every((w: { difficulty: string }) => w.difficulty === 'advanced'),
    ).toBe(true);
  });

  it('searches name and description case-insensitively', async () => {
    const res = await request(app).get('/api/workouts?q=YOGA');
    expect(res.body.workouts.length).toBeGreaterThan(0);
  });

  it('returns an empty list rather than an error when nothing matches', async () => {
    const res = await request(app).get('/api/workouts?q=zzzznotathing');
    expect(res.status).toBe(200);
    expect(res.body.workouts).toEqual([]);
  });

  it('rejects an invalid filter value', async () => {
    const res = await request(app).get('/api/workouts?type=interpretive-dance');
    expect(res.status).toBe(400);
  });

  it('returns a single workout', async () => {
    const res = await request(app).get('/api/workouts/1');
    expect(res.body.workout.id).toBe(1);
  });

  it('404s an unknown workout', async () => {
    expect((await request(app).get('/api/workouts/99999')).status).toBe(404);
  });

  it('400s a non-numeric id', async () => {
    expect((await request(app).get('/api/workouts/abc')).status).toBe(400);
  });
});

describe('workout sessions', () => {
  it('starts and finishes a session, estimating calories from elapsed time', async () => {
    const cookie = await signInAsDemo();
    const started = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookie)
      .send({ workoutId: 2 });
    expect(started.status).toBe(201);

    const finished = await request(app)
      .post(`/api/sessions/${started.body.session.id}/finish`)
      .set('Cookie', cookie)
      .send({ elapsedSec: 2700 });
    expect(finished.status).toBe(200);
    expect(finished.body.session.completed).toBe(true);
    expect(finished.body.session.caloriesBurned).toBeGreaterThan(0);
  });

  it('accepts an explicit calorie figure', async () => {
    const cookie = await signInAsDemo();
    const started = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookie)
      .send({ workoutId: 1 });
    const finished = await request(app)
      .post(`/api/sessions/${started.body.session.id}/finish`)
      .set('Cookie', cookie)
      .send({ elapsedSec: 600, caloriesBurned: 999 });
    expect(finished.body.session.caloriesBurned).toBe(999);
  });

  it('rejects starting a session for a workout that does not exist', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookie)
      .send({ workoutId: 9999 });
    expect(res.status).toBe(404);
  });

  it('409s a double finish', async () => {
    const cookie = await signInAsDemo();
    const started = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookie)
      .send({ workoutId: 1 });
    const id = started.body.session.id;
    await request(app)
      .post(`/api/sessions/${id}/finish`)
      .set('Cookie', cookie)
      .send({ elapsedSec: 60 });
    const second = await request(app)
      .post(`/api/sessions/${id}/finish`)
      .set('Cookie', cookie)
      .send({ elapsedSec: 60 });
    expect(second.status).toBe(409);
  });

  it('403s finishing a session that belongs to someone else', async () => {
    const demoCookie = await signInAsDemo();
    const started = await request(app)
      .post('/api/sessions')
      .set('Cookie', demoCookie)
      .send({ workoutId: 1 });

    const otherCookie = await registerFresh('intruder');
    const res = await request(app)
      .post(`/api/sessions/${started.body.session.id}/finish`)
      .set('Cookie', otherCookie)
      .send({ elapsedSec: 60 });
    expect(res.status).toBe(403);
  });

  it('404s finishing a session that does not exist', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .post('/api/sessions/99999/finish')
      .set('Cookie', cookie)
      .send({ elapsedSec: 60 });
    expect(res.status).toBe(404);
  });

  it('lists only the signed-in user sessions', async () => {
    const cookie = await registerFresh('sessionlist');
    const res = await request(app).get('/api/sessions').set('Cookie', cookie);
    expect(res.body.sessions).toEqual([]);
  });

  it('rejects an out-of-range elapsed time', async () => {
    const cookie = await signInAsDemo();
    const started = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookie)
      .send({ workoutId: 1 });
    const res = await request(app)
      .post(`/api/sessions/${started.body.session.id}/finish`)
      .set('Cookie', cookie)
      .send({ elapsedSec: 999_999 });
    expect(res.status).toBe(400);
  });
});

describe('challenges', () => {
  it('lists challenges with derived progress and participant counts', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/challenges').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.challenges.length).toBeGreaterThan(0);
    for (const c of res.body.challenges) {
      expect(c.participantCount).toBeGreaterThan(0);
      expect(c.percent).toBeGreaterThanOrEqual(0);
      expect(c.percent).toBeLessThanOrEqual(100);
    }
  });

  it('returns a ranked leaderboard', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/challenges/1/leaderboard').set('Cookie', cookie);
    const rows = res.body.leaderboard;
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((r: { rank: number }) => r.rank)).toEqual(
      rows.map((_: unknown, i: number) => i + 1),
    );
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i - 1].progress).toBeGreaterThanOrEqual(rows[i].progress);
    }
  });

  it('marks the generated pace-setters and does not mark a real account', async () => {
    const cookie = await signInAsDemo();
    await request(app).post('/api/challenges/1/join').set('Cookie', cookie);

    const res = await request(app).get('/api/challenges/1/leaderboard').set('Cookie', cookie);
    const rows: Array<{ username: string; isSample: boolean }> = res.body.leaderboard;

    expect(rows.filter((r) => r.isSample).length).toBeGreaterThan(0);
    // The signed-in human is never labelled a sample.
    expect(rows.find((r) => r.username === DEMO_USERNAME)?.isSample).toBe(false);
  });

  it('never exposes a password hash on the leaderboard', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/challenges/1/leaderboard').set('Cookie', cookie);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('joins and leaves, and the join is idempotent', async () => {
    const cookie = await registerFresh('joiner');
    expect(
      (await request(app).post('/api/challenges/1/join').set('Cookie', cookie).send()).status,
    ).toBe(201);
    expect(
      (await request(app).post('/api/challenges/1/join').set('Cookie', cookie).send()).status,
    ).toBe(201);

    const joined = await request(app).get('/api/challenges').set('Cookie', cookie);
    expect(joined.body.challenges.find((c: { id: number }) => c.id === 1).joined).toBe(true);

    await request(app).delete('/api/challenges/1/join').set('Cookie', cookie).send();
    const left = await request(app).get('/api/challenges').set('Cookie', cookie);
    expect(left.body.challenges.find((c: { id: number }) => c.id === 1).joined).toBe(false);
  });

  it('404s joining a challenge that does not exist', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).post('/api/challenges/9999/join').set('Cookie', cookie).send();
    expect(res.status).toBe(404);
  });

  it('404s a leaderboard for a challenge that does not exist', async () => {
    const cookie = await signInAsDemo();
    expect(
      (await request(app).get('/api/challenges/9999/leaderboard').set('Cookie', cookie)).status,
    ).toBe(404);
  });

  it('derives challenge progress from logged activity', async () => {
    const cookie = await registerFresh('progressuser');
    await request(app).post('/api/challenges/1/join').set('Cookie', cookie).send();

    const before = await request(app).get('/api/challenges').set('Cookie', cookie);
    expect(before.body.challenges.find((c: { id: number }) => c.id === 1).progress).toBe(0);

    await request(app).put('/api/activity').set('Cookie', cookie).send({ steps: 9000 });

    const after = await request(app).get('/api/challenges').set('Cookie', cookie);
    expect(after.body.challenges.find((c: { id: number }) => c.id === 1).progress).toBe(9000);
  });
});

describe('profile', () => {
  it('updates allowed fields', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie)
      .send({ firstName: 'Renamed', heightCm: 180 });
    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe('Renamed');
    expect(res.body.user.heightCm).toBe(180);
  });

  it('rejects an attempt to set fields outside the allow-list', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie)
      .send({ username: 'hacked', passwordHash: 'x' });
    expect(res.status).toBe(400);
  });

  it('only ever updates the signed-in user', async () => {
    // There is no route that takes a user id, so cross-user writes are
    // structurally impossible rather than merely checked.
    const cookie = await registerFresh('selfonly');
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', cookie)
      .send({ firstName: 'Me' });
    expect(res.body.user.username).toBe('selfonly');
  });
});

describe('insights', () => {
  it('returns insights derived from the account data', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app).get('/api/insights').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.insights.length).toBeGreaterThan(0);
    for (const insight of res.body.insights) {
      expect(insight.basis).toBeTruthy();
    }
  });

  it('returns the onboarding insight for an account with no history', async () => {
    const cookie = await registerFresh('brandnew');
    const res = await request(app).get('/api/insights').set('Cookie', cookie);
    expect(res.body.insights.length).toBeGreaterThan(0);
  });
});

describe('malformed requests', () => {
  it('returns 400 for a body that is not valid JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
  });

  it('rejects an oversized body', async () => {
    const cookie = await signInAsDemo();
    const res = await request(app)
      .put('/api/activity')
      .set('Cookie', cookie)
      .send({ steps: 1, note: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });
});
