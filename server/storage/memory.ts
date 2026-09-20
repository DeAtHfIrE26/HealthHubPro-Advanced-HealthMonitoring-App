/**
 * Process-local storage. Used whenever DATABASE_URL is absent.
 *
 * Data is seeded on init and resets when the process does — the UI says so
 * plainly rather than pretending otherwise. Mirrors PostgresStorage exactly,
 * and the same integration suite runs against both.
 */
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
import type { ImportDay, ImportResult } from '../../shared/import.js';
import { addDays, buildSeed, todayIso } from './seed.js';
import type {
  ActivityPatch,
  NewUser,
  SessionWithWorkout,
  Storage,
  UserPatch,
  WorkoutFilter,
} from './types.js';

function nextId(rows: Array<{ id: number }>): number {
  return rows.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
}

/**
 * Decides what an import actually writes for an existing day.
 *
 * `merge` only fills metrics currently at zero, so importing history can
 * never silently overwrite something the user logged by hand.
 */
export function resolveMerge(
  existing: Pick<
    ActivityStat,
    'steps' | 'calories' | 'activeMinutes' | 'sleepHours' | 'waterLiters'
  >,
  incoming: Omit<ImportDay, 'date'>,
  strategy: 'merge' | 'overwrite',
): Partial<ActivityStat> {
  const patch: Partial<ActivityStat> = {};
  const keys = ['steps', 'calories', 'activeMinutes', 'sleepHours', 'waterLiters'] as const;

  for (const key of keys) {
    const value = incoming[key];
    if (value === undefined) continue;
    if (strategy === 'merge' && existing[key] !== 0) continue;
    if (existing[key] === value) continue;
    patch[key] = value;
  }

  return patch;
}

export function rangeOf(dates: string[]): { from: string; to: string } | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return { from: sorted[0]!, to: sorted[sorted.length - 1]! };
}

/** Inclusive on both ends, comparing YYYY-MM-DD lexicographically. */
function withinRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export class MemoryStorage implements Storage {
  readonly persistent = false;

  private users: User[] = [];
  private activity: ActivityStat[] = [];
  private goals: Goal[] = [];
  private workouts: Workout[] = [];
  private sessions: WorkoutSession[] = [];
  private challenges: Challenge[] = [];
  private participants: Array<{ id: number; challengeId: number; userId: number; joinedAt: Date }> =
    [];
  private initialised = false;

  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;

    const today = todayIso();
    const seed = await buildSeed(today);
    const now = new Date();

    for (const u of seed.users) {
      this.users.push({
        id: nextId(this.users),
        username: u.username,
        email: u.email,
        passwordHash: u.passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        heightCm: u.heightCm,
        weightKg: u.weightKg,
        age: u.age,
        location: u.location,
        createdAt: now,
      });
    }

    for (const w of seed.workouts) {
      this.workouts.push({ id: nextId(this.workouts), ...w });
    }

    for (const c of seed.challenges) {
      this.challenges.push({ id: nextId(this.challenges), ...c });
    }

    for (const a of seed.activity) {
      const user = this.users.find((u) => u.username === a.username);
      if (!user) continue;
      this.activity.push({
        id: nextId(this.activity),
        userId: user.id,
        date: a.date,
        steps: a.steps,
        calories: a.calories,
        activeMinutes: a.activeMinutes,
        sleepHours: a.sleepHours,
        waterLiters: a.waterLiters,
      });
    }

    for (const g of seed.goals) {
      const user = this.users.find((u) => u.username === g.username);
      if (!user) continue;
      this.goals.push({
        id: nextId(this.goals),
        userId: user.id,
        type: g.type,
        target: g.target,
        createdAt: now,
      });
    }

    for (const p of seed.participants) {
      const user = this.users.find((u) => u.username === p.username);
      const challenge = this.challenges.find((c) => c.name === p.challengeName);
      if (!user || !challenge) continue;
      this.participants.push({
        id: nextId(this.participants),
        challengeId: challenge.id,
        userId: user.id,
        joinedAt: now,
      });
    }

    for (const s of seed.sessions) {
      const user = this.users.find((u) => u.username === s.username);
      const workout = this.workouts.find((w) => w.name === s.workoutName);
      if (!user || !workout) continue;
      const day = addDays(today, -s.daysAgo);
      const startedAt = new Date(`${day}T07:30:00Z`);
      this.sessions.push({
        id: nextId(this.sessions),
        userId: user.id,
        workoutId: workout.id,
        startedAt,
        completedAt: new Date(startedAt.getTime() + s.elapsedSec * 1000),
        elapsedSec: s.elapsedSec,
        caloriesBurned: s.caloriesBurned,
        completed: true,
      });
    }
  }

  /* ---------------------------------------------------------------- users */

  async getUserById(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const lowered = username.toLowerCase();
    return this.users.find((u) => u.username.toLowerCase() === lowered) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const lowered = email.toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === lowered) ?? null;
  }

  async createUser(data: NewUser): Promise<User> {
    const user: User = {
      id: nextId(this.users),
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      heightCm: null,
      weightKg: null,
      age: null,
      location: null,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async updateUser(id: number, patch: UserPatch): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    return user;
  }

  /* ------------------------------------------------------------- activity */

  async getActivityForDate(userId: number, date: string): Promise<ActivityStat | null> {
    return this.activity.find((a) => a.userId === userId && a.date === date) ?? null;
  }

  async upsertActivity(userId: number, date: string, patch: ActivityPatch): Promise<ActivityStat> {
    const existing = this.activity.find((a) => a.userId === userId && a.date === date);
    if (existing) {
      Object.assign(existing, patch);
      return existing;
    }
    const created: ActivityStat = {
      id: nextId(this.activity),
      userId,
      date,
      steps: patch.steps ?? 0,
      calories: patch.calories ?? 0,
      activeMinutes: patch.activeMinutes ?? 0,
      sleepHours: patch.sleepHours ?? 0,
      waterLiters: patch.waterLiters ?? 0,
    };
    this.activity.push(created);
    return created;
  }

  async getActivityHistory(userId: number, days: number, endDate: string): Promise<ActivityStat[]> {
    const out: ActivityStat[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = addDays(endDate, -i);
      const found = this.activity.find((a) => a.userId === userId && a.date === date);
      out.push(
        found ?? {
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
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const written: string[] = [];

    for (const day of days) {
      const { date, ...metrics } = day;
      const existing = this.activity.find((a) => a.userId === userId && a.date === date);

      if (!existing) {
        this.activity.push({
          id: nextId(this.activity),
          userId,
          date,
          steps: metrics.steps ?? 0,
          calories: metrics.calories ?? 0,
          activeMinutes: metrics.activeMinutes ?? 0,
          sleepHours: metrics.sleepHours ?? 0,
          waterLiters: metrics.waterLiters ?? 0,
        });
        created += 1;
        written.push(date);
        continue;
      }

      const patch = resolveMerge(existing, metrics, strategy);
      if (Object.keys(patch).length === 0) {
        skipped += 1;
        continue;
      }

      Object.assign(existing, patch);
      updated += 1;
      written.push(date);
    }

    return { created, updated, skipped, range: rangeOf(written) };
  }

  async getAllActivity(userId: number): Promise<ActivityStat[]> {
    return this.activity
      .filter((a) => a.userId === userId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ---------------------------------------------------------------- goals */

  async getGoals(userId: number): Promise<Goal[]> {
    return this.goals.filter((g) => g.userId === userId);
  }

  async upsertGoal(userId: number, type: GoalType, target: number): Promise<Goal> {
    const existing = this.goals.find((g) => g.userId === userId && g.type === type);
    if (existing) {
      existing.target = target;
      return existing;
    }
    const created: Goal = {
      id: nextId(this.goals),
      userId,
      type,
      target,
      createdAt: new Date(),
    };
    this.goals.push(created);
    return created;
  }

  /* ------------------------------------------------------------- workouts */

  async listWorkouts(filter: WorkoutFilter): Promise<Workout[]> {
    const q = filter.q?.toLowerCase();
    return this.workouts.filter((w) => {
      if (filter.type && w.type !== filter.type) return false;
      if (filter.difficulty && w.difficulty !== filter.difficulty) return false;
      if (q && !`${w.name} ${w.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  async getWorkout(id: number): Promise<Workout | null> {
    return this.workouts.find((w) => w.id === id) ?? null;
  }

  /* ------------------------------------------------------------- sessions */

  async startSession(userId: number, workoutId: number): Promise<WorkoutSession> {
    const session: WorkoutSession = {
      id: nextId(this.sessions),
      userId,
      workoutId,
      startedAt: new Date(),
      completedAt: null,
      elapsedSec: 0,
      caloriesBurned: 0,
      completed: false,
    };
    this.sessions.push(session);
    return session;
  }

  async getSession(id: number): Promise<WorkoutSession | null> {
    return this.sessions.find((s) => s.id === id) ?? null;
  }

  async finishSession(
    id: number,
    data: { elapsedSec: number; caloriesBurned: number },
  ): Promise<WorkoutSession | null> {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return null;
    session.elapsedSec = data.elapsedSec;
    session.caloriesBurned = data.caloriesBurned;
    session.completed = true;
    session.completedAt = new Date();
    return session;
  }

  async listSessions(userId: number, limit: number): Promise<SessionWithWorkout[]> {
    return this.sessions
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit)
      .flatMap((s) => {
        const workout = this.workouts.find((w) => w.id === s.workoutId);
        return workout ? [{ ...s, workout }] : [];
      });
  }

  async countCompletedSessions(userId: number, from: string, to: string): Promise<number> {
    return this.sessions.filter((s) => {
      if (s.userId !== userId || !s.completed || !s.completedAt) return false;
      return withinRange(s.completedAt.toISOString().slice(0, 10), from, to);
    }).length;
  }

  /* ----------------------------------------------------------- challenges */

  async listChallenges(): Promise<Challenge[]> {
    return [...this.challenges];
  }

  async getChallenge(id: number): Promise<Challenge | null> {
    return this.challenges.find((c) => c.id === id) ?? null;
  }

  async isParticipant(challengeId: number, userId: number): Promise<boolean> {
    return this.participants.some((p) => p.challengeId === challengeId && p.userId === userId);
  }

  async joinChallenge(challengeId: number, userId: number): Promise<void> {
    if (await this.isParticipant(challengeId, userId)) return;
    this.participants.push({
      id: nextId(this.participants),
      challengeId,
      userId,
      joinedAt: new Date(),
    });
  }

  async leaveChallenge(challengeId: number, userId: number): Promise<void> {
    this.participants = this.participants.filter(
      (p) => !(p.challengeId === challengeId && p.userId === userId),
    );
  }

  async countParticipants(challengeId: number): Promise<number> {
    return this.participants.filter((p) => p.challengeId === challengeId).length;
  }

  async getChallengeProgress(challenge: Challenge, userId: number): Promise<number> {
    if (challenge.type === 'workouts') {
      return this.countCompletedSessions(userId, challenge.startDate, challenge.endDate);
    }
    const field =
      challenge.type === 'steps'
        ? 'steps'
        : challenge.type === 'calories'
          ? 'calories'
          : 'activeMinutes';
    return this.activity
      .filter(
        (a) => a.userId === userId && withinRange(a.date, challenge.startDate, challenge.endDate),
      )
      .reduce((sum, a) => sum + a[field], 0);
  }

  async getLeaderboard(challengeId: number): Promise<LeaderboardEntry[]> {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) return [];

    const rows = await Promise.all(
      this.participants
        .filter((p) => p.challengeId === challengeId)
        .map(async (p) => {
          const user = this.users.find((u) => u.id === p.userId);
          if (!user) return null;
          const progress = await this.getChallengeProgress(challenge, p.userId);
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
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.progress - a.progress || a.username.localeCompare(b.username))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
