/**
 * Postgres-backed storage via Drizzle + Neon serverless.
 *
 * Used automatically when DATABASE_URL is set. Schema is created on init so a
 * fresh Neon database works with no manual migration step, and seeding is
 * idempotent — it only runs when the users table is empty.
 */
import { neon } from '@neondatabase/serverless';
import { and, asc, between, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  ActivityStat,
  Challenge,
  Goal,
  GoalType,
  LeaderboardEntry,
  User,
  Workout,
  WorkoutSession,
} from '../../shared/schema.js';
import {
  activityStats,
  challengeParticipants,
  challenges,
  goals,
  users,
  workoutSessions,
  workouts,
} from '../../shared/tables.js';
import type { ImportDay, ImportResult } from '../../shared/import.js';
import { addDays, buildSeed, todayIso } from './seed.js';
import { rangeOf, resolveMerge } from './memory.js';
import type {
  ActivityPatch,
  NewUser,
  SessionWithWorkout,
  Storage,
  UserPatch,
  WorkoutFilter,
} from './types.js';

/**
 * Postgres error codes meaning "the thing you are creating is already there",
 * raised when two connections create the same object at once.
 *
 * 42P07 duplicate_table and 42710 duplicate_object are the direct forms.
 * 23505 is the indirect one: creating a table also creates its implicit
 * sequence, and losing that insert into pg_class surfaces as a unique
 * violation on a catalog index rather than as a duplicate-object error. Only
 * catalog constraints count, so a genuine unique violation on application
 * data is never swallowed.
 */
const DUPLICATE_OBJECT_CODES = new Set(['42P07', '42710', '42P06', '42723']);

export function isConcurrentCreate(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 5; depth += 1) {
    const { code, constraint } = e as { code?: string; constraint?: string };
    if (code && DUPLICATE_OBJECT_CODES.has(code)) return true;
    if (code === '23505' && constraint?.startsWith('pg_')) return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export class PostgresStorage implements Storage {
  readonly persistent = true;

  private readonly db: NeonHttpDatabase;
  private initialised = false;

  constructor(connectionString: string) {
    this.db = drizzle(neon(connectionString));
  }

  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;

    /*
     * Only touch DDL when the schema is actually absent.
     *
     * This used to run nine CREATE statements on every cold start. That cost
     * nine HTTP round trips each time on Neon's driver, and it broke: two
     * instances cold-starting together both found the tables missing and both
     * created them, and the loser returned a 500. Seen in production as
     *
     *   NeonDbError 23505: duplicate key value violates unique constraint
     *   "pg_class_relname_nsp_index" ... Key (relname)=(users_id_seq)
     *
     * because CREATE TABLE IF NOT EXISTS is not atomic -- the existence check
     * and the creation are separate steps with a gap between them. Reproduced
     * locally against Postgres 16 with twelve concurrent creates behind a
     * barrier, where it surfaces as 42P07 instead: same race, caught a moment
     * later.
     *
     * The probe closes the common case, and createSchema tolerates the race
     * for the genuine first boot where several instances can still collide.
     */
    if (!(await this.schemaExists())) {
      await this.createSchema();
    }

    const [existing] = await this.db.select({ n: count() }).from(users);
    if ((existing?.n ?? 0) > 0) return;

    await this.seed();
  }

  /**
   * Whether the schema is already in place.
   *
   * Checks the table created last, so a boot interrupted halfway through
   * createSchema is completed on the next one rather than left broken.
   */
  private async schemaExists(): Promise<boolean> {
    const rows = await this.db.execute(
      sql`select to_regclass('public.challenge_participants') is not null as present`,
    );
    const row = (rows as unknown as Array<{ present: boolean }>)[0];
    return row?.present === true;
  }

  /**
   * Created with raw DDL rather than drizzle-kit so a fresh database works on
   * first boot without a separate migration step.
   */
  private async createSchema(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        username varchar(50) NOT NULL UNIQUE,
        email varchar(255) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        first_name varchar(50) NOT NULL,
        last_name varchar(50) NOT NULL,
        height_cm integer,
        weight_kg real,
        age integer,
        location varchar(120),
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS workouts (
        id serial PRIMARY KEY,
        name varchar(100) NOT NULL,
        type varchar(20) NOT NULL,
        description text NOT NULL DEFAULT '',
        difficulty varchar(20) NOT NULL,
        duration_min integer NOT NULL,
        calories_burn integer NOT NULL,
        exercises jsonb NOT NULL DEFAULT '[]'::jsonb
      )`,
      `CREATE TABLE IF NOT EXISTS activity_stats (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        steps integer NOT NULL DEFAULT 0,
        calories integer NOT NULL DEFAULT 0,
        active_minutes integer NOT NULL DEFAULT 0,
        sleep_hours real NOT NULL DEFAULT 0,
        water_liters real NOT NULL DEFAULT 0,
        CONSTRAINT activity_stats_user_date UNIQUE (user_id, date)
      )`,
      `CREATE INDEX IF NOT EXISTS activity_stats_user_idx ON activity_stats (user_id)`,
      `CREATE TABLE IF NOT EXISTS goals (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(20) NOT NULL,
        target real NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT goals_user_type UNIQUE (user_id, type)
      )`,
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id integer NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        elapsed_sec integer NOT NULL DEFAULT 0,
        calories_burned integer NOT NULL DEFAULT 0,
        completed boolean NOT NULL DEFAULT false
      )`,
      `CREATE INDEX IF NOT EXISTS workout_sessions_user_idx ON workout_sessions (user_id)`,
      `CREATE TABLE IF NOT EXISTS challenges (
        id serial PRIMARY KEY,
        name varchar(100) NOT NULL,
        description text NOT NULL DEFAULT '',
        type varchar(20) NOT NULL,
        target real NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS challenge_participants (
        id serial PRIMARY KEY,
        challenge_id integer NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT challenge_participants_unique UNIQUE (challenge_id, user_id)
      )`,
    ];

    for (const statement of statements) {
      try {
        await this.db.execute(sql.raw(statement));
      } catch (error) {
        // Another instance won the same first boot. Its object is the one we
        // wanted, so carry on; anything else is a real failure.
        if (!isConcurrentCreate(error)) throw error;
      }
    }
  }

  /**
   * Seeds a fresh database, once, even if several instances try at the same
   * time.
   *
   * The count check in init() has the same gap as CREATE IF NOT EXISTS: two
   * cold starts can both read zero users and both proceed. The users insert
   * is the claim -- `username` is unique, so exactly one caller gets rows
   * back and the rest bail out before duplicating the workouts, challenges
   * and thirty days of activity that follow.
   */
  private async seed(): Promise<void> {
    const today = todayIso();
    const data = await buildSeed(today);

    const insertedUsers = await this.db
      .insert(users)
      .values(
        data.users.map((u) => ({
          username: u.username,
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          heightCm: u.heightCm,
          weightKg: u.weightKg,
          age: u.age,
          location: u.location,
        })),
      )
      .onConflictDoNothing()
      .returning();

    if (insertedUsers.length === 0) return;

    const insertedWorkouts = await this.db.insert(workouts).values(data.workouts).returning();
    const insertedChallenges = await this.db.insert(challenges).values(data.challenges).returning();

    const userByName = new Map(insertedUsers.map((u) => [u.username, u]));
    const workoutByName = new Map(insertedWorkouts.map((w) => [w.name, w]));
    const challengeByName = new Map(insertedChallenges.map((c) => [c.name, c]));

    const activityRows = data.activity.flatMap((a) => {
      const user = userByName.get(a.username);
      return user
        ? [
            {
              userId: user.id,
              date: a.date,
              steps: a.steps,
              calories: a.calories,
              activeMinutes: a.activeMinutes,
              sleepHours: a.sleepHours,
              waterLiters: a.waterLiters,
            },
          ]
        : [];
    });

    // Neon's HTTP driver caps statement size, so insert activity in batches.
    const BATCH = 100;
    for (let i = 0; i < activityRows.length; i += BATCH) {
      await this.db.insert(activityStats).values(activityRows.slice(i, i + BATCH));
    }

    const goalRows = data.goals.flatMap((g) => {
      const user = userByName.get(g.username);
      return user ? [{ userId: user.id, type: g.type, target: g.target }] : [];
    });
    if (goalRows.length) await this.db.insert(goals).values(goalRows);

    const participantRows = data.participants.flatMap((p) => {
      const user = userByName.get(p.username);
      const challenge = challengeByName.get(p.challengeName);
      return user && challenge ? [{ challengeId: challenge.id, userId: user.id }] : [];
    });
    if (participantRows.length) await this.db.insert(challengeParticipants).values(participantRows);

    const sessionRows = data.sessions.flatMap((s) => {
      const user = userByName.get(s.username);
      const workout = workoutByName.get(s.workoutName);
      if (!user || !workout) return [];
      const startedAt = new Date(`${addDays(today, -s.daysAgo)}T07:30:00Z`);
      return [
        {
          userId: user.id,
          workoutId: workout.id,
          startedAt,
          completedAt: new Date(startedAt.getTime() + s.elapsedSec * 1000),
          elapsedSec: s.elapsedSec,
          caloriesBurned: s.caloriesBurned,
          completed: true,
        },
      ];
    });
    if (sessionRows.length) await this.db.insert(workoutSessions).values(sessionRows);
  }

  /* ---------------------------------------------------------------- users */

  async getUserById(id: number): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1);
    return row ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);
    return row ?? null;
  }

  async createUser(data: NewUser): Promise<User> {
    const [row] = await this.db.insert(users).values(data).returning();
    if (!row) throw new Error('Failed to create user');
    return row;
  }

  async updateUser(id: number, patch: UserPatch): Promise<User | null> {
    if (Object.keys(patch).length === 0) return this.getUserById(id);
    const [row] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning();
    return row ?? null;
  }

  /* ------------------------------------------------------------- activity */

  async getActivityForDate(userId: number, date: string): Promise<ActivityStat | null> {
    const [row] = await this.db
      .select()
      .from(activityStats)
      .where(and(eq(activityStats.userId, userId), eq(activityStats.date, date)))
      .limit(1);
    return row ?? null;
  }

  async upsertActivity(userId: number, date: string, patch: ActivityPatch): Promise<ActivityStat> {
    const [row] = await this.db
      .insert(activityStats)
      .values({
        userId,
        date,
        steps: patch.steps ?? 0,
        calories: patch.calories ?? 0,
        activeMinutes: patch.activeMinutes ?? 0,
        sleepHours: patch.sleepHours ?? 0,
        waterLiters: patch.waterLiters ?? 0,
      })
      .onConflictDoUpdate({
        target: [activityStats.userId, activityStats.date],
        set: patch,
      })
      .returning();
    if (!row) throw new Error('Failed to upsert activity');
    return row;
  }

  async getActivityHistory(userId: number, days: number, endDate: string): Promise<ActivityStat[]> {
    const startDate = addDays(endDate, -(days - 1));
    const rows = await this.db
      .select()
      .from(activityStats)
      .where(and(eq(activityStats.userId, userId), between(activityStats.date, startDate, endDate)))
      .orderBy(asc(activityStats.date));

    const byDate = new Map(rows.map((r) => [r.date, r]));
    const out: ActivityStat[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = addDays(endDate, -i);
      out.push(
        byDate.get(date) ?? {
          id: -1,
          userId,
          date,
          steps: 0,
          calories: 0,
          activeMinutes: 0,
          sleepHours: 0,
          waterLiters: 0,
        },
      );
    }
    return out;
  }

  async bulkUpsertActivity(
    userId: number,
    days: ImportDay[],
    strategy: 'merge' | 'overwrite',
  ): Promise<ImportResult> {
    if (days.length === 0) return { created: 0, updated: 0, skipped: 0, range: null };

    // Read the affected window once rather than per row: the merge decision
    // needs to know what is already stored, and N round trips over an HTTP
    // driver would be unusably slow for a multi-year import.
    const dates = days.map((d) => d.date).sort();
    const existingRows = await this.db
      .select()
      .from(activityStats)
      .where(
        and(
          eq(activityStats.userId, userId),
          between(activityStats.date, dates[0]!, dates[dates.length - 1]!),
        ),
      );
    const existingByDate = new Map(existingRows.map((r) => [r.date, r]));

    const toWrite: Array<typeof activityStats.$inferInsert> = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const { date, ...metrics } of days) {
      const existing = existingByDate.get(date);

      if (!existing) {
        toWrite.push({
          userId,
          date,
          steps: metrics.steps ?? 0,
          calories: metrics.calories ?? 0,
          activeMinutes: metrics.activeMinutes ?? 0,
          sleepHours: metrics.sleepHours ?? 0,
          waterLiters: metrics.waterLiters ?? 0,
        });
        created += 1;
        continue;
      }

      const patch = resolveMerge(existing, metrics, strategy);
      if (Object.keys(patch).length === 0) {
        skipped += 1;
        continue;
      }

      toWrite.push({ ...existing, ...patch, userId, date });
      updated += 1;
    }

    // Neon's HTTP driver caps statement size, so write in batches.
    const BATCH = 100;
    for (let i = 0; i < toWrite.length; i += BATCH) {
      const slice = toWrite.slice(i, i + BATCH);
      await this.db
        .insert(activityStats)
        .values(slice)
        .onConflictDoUpdate({
          target: [activityStats.userId, activityStats.date],
          set: {
            steps: sql`excluded.steps`,
            calories: sql`excluded.calories`,
            activeMinutes: sql`excluded.active_minutes`,
            sleepHours: sql`excluded.sleep_hours`,
            waterLiters: sql`excluded.water_liters`,
          },
        });
    }

    return { created, updated, skipped, range: rangeOf(toWrite.map((r) => r.date as string)) };
  }

  async getAllActivity(userId: number): Promise<ActivityStat[]> {
    return this.db
      .select()
      .from(activityStats)
      .where(eq(activityStats.userId, userId))
      .orderBy(asc(activityStats.date));
  }

  /* ---------------------------------------------------------------- goals */

  async getGoals(userId: number): Promise<Goal[]> {
    return this.db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.id));
  }

  async upsertGoal(userId: number, type: GoalType, target: number): Promise<Goal> {
    const [row] = await this.db
      .insert(goals)
      .values({ userId, type, target })
      .onConflictDoUpdate({ target: [goals.userId, goals.type], set: { target } })
      .returning();
    if (!row) throw new Error('Failed to upsert goal');
    return row;
  }

  /* ------------------------------------------------------------- workouts */

  async listWorkouts(filter: WorkoutFilter): Promise<Workout[]> {
    const conditions = [];
    if (filter.type) conditions.push(eq(workouts.type, filter.type));
    if (filter.difficulty) conditions.push(eq(workouts.difficulty, filter.difficulty));
    if (filter.q) {
      const pattern = `%${filter.q}%`;
      const match = or(ilike(workouts.name, pattern), ilike(workouts.description, pattern));
      if (match) conditions.push(match);
    }
    const query = this.db.select().from(workouts).orderBy(asc(workouts.id));
    return conditions.length ? query.where(and(...conditions)) : query;
  }

  async getWorkout(id: number): Promise<Workout | null> {
    const [row] = await this.db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
    return row ?? null;
  }

  /* ------------------------------------------------------------- sessions */

  async startSession(userId: number, workoutId: number): Promise<WorkoutSession> {
    const [row] = await this.db.insert(workoutSessions).values({ userId, workoutId }).returning();
    if (!row) throw new Error('Failed to start session');
    return row;
  }

  async getSession(id: number): Promise<WorkoutSession | null> {
    const [row] = await this.db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id))
      .limit(1);
    return row ?? null;
  }

  async finishSession(
    id: number,
    data: { elapsedSec: number; caloriesBurned: number },
  ): Promise<WorkoutSession | null> {
    const [row] = await this.db
      .update(workoutSessions)
      .set({ ...data, completed: true, completedAt: new Date() })
      .where(eq(workoutSessions.id, id))
      .returning();
    return row ?? null;
  }

  async listSessions(userId: number, limit: number): Promise<SessionWithWorkout[]> {
    const rows = await this.db
      .select({ session: workoutSessions, workout: workouts })
      .from(workoutSessions)
      .innerJoin(workouts, eq(workouts.id, workoutSessions.workoutId))
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(limit);
    return rows.map((r) => ({ ...r.session, workout: r.workout }));
  }

  async countCompletedSessions(userId: number, from: string, to: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.completed, true),
          sql`${workoutSessions.completedAt}::date BETWEEN ${from}::date AND ${to}::date`,
        ),
      );
    return row?.n ?? 0;
  }

  /* ----------------------------------------------------------- challenges */

  async listChallenges(): Promise<Challenge[]> {
    return this.db.select().from(challenges).orderBy(asc(challenges.id));
  }

  async getChallenge(id: number): Promise<Challenge | null> {
    const [row] = await this.db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
    return row ?? null;
  }

  async isParticipant(challengeId: number, userId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ n: count() })
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId),
        ),
      );
    return (row?.n ?? 0) > 0;
  }

  async joinChallenge(challengeId: number, userId: number): Promise<void> {
    await this.db
      .insert(challengeParticipants)
      .values({ challengeId, userId })
      .onConflictDoNothing();
  }

  async leaveChallenge(challengeId: number, userId: number): Promise<void> {
    await this.db
      .delete(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId),
        ),
      );
  }

  async countParticipants(challengeId: number): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));
    return row?.n ?? 0;
  }

  async getChallengeProgress(challenge: Challenge, userId: number): Promise<number> {
    if (challenge.type === 'workouts') {
      return this.countCompletedSessions(userId, challenge.startDate, challenge.endDate);
    }
    const column =
      challenge.type === 'steps'
        ? activityStats.steps
        : challenge.type === 'calories'
          ? activityStats.calories
          : activityStats.activeMinutes;

    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${column}), 0)::float8` })
      .from(activityStats)
      .where(
        and(
          eq(activityStats.userId, userId),
          between(activityStats.date, challenge.startDate, challenge.endDate),
        ),
      );
    return row?.total ?? 0;
  }

  async getLeaderboard(challengeId: number): Promise<LeaderboardEntry[]> {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) return [];

    const participants = await this.db
      .select({ user: users })
      .from(challengeParticipants)
      .innerJoin(users, eq(users.id, challengeParticipants.userId))
      .where(eq(challengeParticipants.challengeId, challengeId));

    const rows = await Promise.all(
      participants.map(async ({ user }) => {
        const progress = await this.getChallengeProgress(challenge, user.id);
        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          username: user.username,
          progress,
          percent: Math.min(100, Math.round((progress / challenge.target) * 100)),
        };
      }),
    );

    return rows
      .sort((a, b) => b.progress - a.progress || a.username.localeCompare(b.username))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
