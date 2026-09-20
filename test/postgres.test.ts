/**
 * Parity checks for PostgresStorage.
 *
 * Skipped unless DATABASE_URL is set, so a clone with no database still has
 * a green suite. When a connection string is present these run against the
 * real database and assert the same behaviour MemoryStorage provides.
 *
 *   DATABASE_URL="postgres://..." npm test
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PostgresStorage } from '../server/storage/postgres';
import { todayIso } from '../server/storage/seed';

const url = process.env.DATABASE_URL?.trim();
const suite = url ? describe : describe.skip;

suite('PostgresStorage', () => {
  // Assigned in beforeAll rather than at collection time: Vitest still
  // evaluates a skipped describe callback, and the Neon driver throws when
  // constructed without a connection string.
  let storage: PostgresStorage;

  beforeAll(() => {
    storage = new PostgresStorage(url as string);
  });

  it('initialises schema and seeds idempotently', async () => {
    await storage.init();
    await storage.init();
    const demo = await storage.getUserByUsername('demo');
    expect(demo).not.toBeNull();
  });

  it('reports itself as persistent', () => {
    expect(storage.persistent).toBe(true);
  });

  it('finds the demo user case-insensitively', async () => {
    expect(await storage.getUserByUsername('DEMO')).not.toBeNull();
    expect(await storage.getUserByEmail('DEMO@HEALTHHUBPRO.APP')).not.toBeNull();
  });

  it('upserts activity on the unique (user, date) key', async () => {
    const demo = await storage.getUserByUsername('demo');
    const date = todayIso();
    await storage.upsertActivity(demo!.id, date, { steps: 100 });
    await storage.upsertActivity(demo!.id, date, { steps: 200 });
    const row = await storage.getActivityForDate(demo!.id, date);
    expect(row?.steps).toBe(200);
  });

  it('zero-fills history gaps', async () => {
    const demo = await storage.getUserByUsername('demo');
    const history = await storage.getActivityHistory(demo!.id, 7, todayIso());
    expect(history).toHaveLength(7);
    const dates = history.map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('derives a ranked leaderboard', async () => {
    const challenges = await storage.listChallenges();
    const rows = await storage.getLeaderboard(challenges[0]!.id);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i - 1]!.progress).toBeGreaterThanOrEqual(rows[i]!.progress);
    }
  });

  it('treats joining a challenge as idempotent', async () => {
    const demo = await storage.getUserByUsername('demo');
    const challenges = await storage.listChallenges();
    const id = challenges[0]!.id;
    const before = await storage.countParticipants(id);
    await storage.joinChallenge(id, demo!.id);
    expect(await storage.countParticipants(id)).toBe(before);
  });
});
