import type { ImportDay, ImportResult } from '../../shared/import.js';
import type {
  ActivityStat,
  Challenge,
  ChallengeType,
  Difficulty,
  Goal,
  GoalType,
  LeaderboardEntry,
  User,
  Workout,
  WorkoutSession,
  WorkoutType,
} from '../../shared/schema.js';

export type NewUser = {
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
};

export type UserPatch = Partial<
  Pick<User, 'firstName' | 'lastName' | 'heightCm' | 'weightKg' | 'age' | 'location'>
>;

export type ActivityPatch = Partial<
  Pick<ActivityStat, 'steps' | 'calories' | 'activeMinutes' | 'sleepHours' | 'waterLiters'>
>;

export type WorkoutFilter = { type?: WorkoutType; difficulty?: Difficulty; q?: string };

export type SessionWithWorkout = WorkoutSession & { workout: Workout };

/**
 * Every data operation the API performs, in one place.
 *
 * Two implementations satisfy this: PostgresStorage (Drizzle/Neon) and
 * MemoryStorage (seeded, process-local). The route layer never knows which
 * one it is talking to, and the integration suite runs against both.
 */
export interface Storage {
  /** True when data survives a restart. Drives the honest "Demo mode" badge. */
  readonly persistent: boolean;

  /** Create tables / seed as needed. Safe to call repeatedly. */
  init(): Promise<void>;

  getUserById(id: number): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: NewUser): Promise<User>;
  updateUser(id: number, patch: UserPatch): Promise<User | null>;

  getActivityForDate(userId: number, date: string): Promise<ActivityStat | null>;
  upsertActivity(userId: number, date: string, patch: ActivityPatch): Promise<ActivityStat>;
  /** Oldest-first, exactly `days` entries ending at `endDate`, zero-filled. */
  getActivityHistory(userId: number, days: number, endDate: string): Promise<ActivityStat[]>;

  /** Bulk import. `merge` only fills metrics currently at zero. */
  bulkUpsertActivity(
    userId: number,
    days: ImportDay[],
    strategy: 'merge' | 'overwrite',
  ): Promise<ImportResult>;

  /** Every activity row for the user, oldest first. Used by export. */
  getAllActivity(userId: number): Promise<ActivityStat[]>;

  getGoals(userId: number): Promise<Goal[]>;
  upsertGoal(userId: number, type: GoalType, target: number): Promise<Goal>;

  listWorkouts(filter: WorkoutFilter): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | null>;

  startSession(userId: number, workoutId: number): Promise<WorkoutSession>;
  getSession(id: number): Promise<WorkoutSession | null>;
  finishSession(
    id: number,
    data: { elapsedSec: number; caloriesBurned: number },
  ): Promise<WorkoutSession | null>;
  listSessions(userId: number, limit: number): Promise<SessionWithWorkout[]>;
  countCompletedSessions(userId: number, from: string, to: string): Promise<number>;

  listChallenges(): Promise<Challenge[]>;
  getChallenge(id: number): Promise<Challenge | null>;
  isParticipant(challengeId: number, userId: number): Promise<boolean>;
  joinChallenge(challengeId: number, userId: number): Promise<void>;
  leaveChallenge(challengeId: number, userId: number): Promise<void>;
  countParticipants(challengeId: number): Promise<number>;
  /** Ranked, highest progress first. Progress is derived, never cached. */
  getLeaderboard(challengeId: number): Promise<LeaderboardEntry[]>;
  getChallengeProgress(challenge: Challenge, userId: number): Promise<number>;
}

export type { ChallengeType };
