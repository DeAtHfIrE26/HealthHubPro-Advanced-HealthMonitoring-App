/**
 * Single source of truth for the data model as the API sees it.
 *
 * The Zod schemas here validate everything crossing the API boundary, and the
 * row types are inferred from the Drizzle tables in `tables.ts`. Both storage
 * implementations (Postgres and in-memory) conform to the types here.
 */
import { z } from 'zod';
import { DIFFICULTIES, GOAL_TYPES, WORKOUT_TYPES } from './enums.js';
// Used in a type position further down; re-exporting it does not bring it
// into this module's own scope.
import type { InsightType } from './enums.js';
/*
 * Type-only: the row types below are inferred from the table definitions, but
 * `import type` is erased, so requiring a validator never loads drizzle.
 */
import type {
  activityStats,
  challengeParticipants,
  challenges,
  goals,
  users,
  workoutSessions,
  workouts,
} from './tables.js';

export type { Exercise } from './tables.js';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export {
  GOAL_TYPES,
  WORKOUT_TYPES,
  DIFFICULTIES,
  CHALLENGE_TYPES,
  INSIGHT_TYPES,
} from './enums.js';
export type { GoalType, WorkoutType, Difficulty, ChallengeType, InsightType } from './enums.js';

/* -------------------------------------------------------------------------- */
/* Inferred row types                                                         */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type ActivityStat = typeof activityStats.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;

/** A user with the password hash stripped — the only shape ever sent to a client. */
export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

/* -------------------------------------------------------------------------- */
/* API validation schemas                                                     */
/* -------------------------------------------------------------------------- */

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be at most 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Use only letters, numbers, hyphens and underscores');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password must be at most 200 characters');

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(200),
});

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    heightCm: z.number().int().min(50).max(280).nullable().optional(),
    weightKg: z.number().min(20).max(500).nullable().optional(),
    age: z.number().int().min(13).max(120).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

/** YYYY-MM-DD, and a real calendar date (rejects 2026-02-31). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Not a valid calendar date');

/**
 * A date that has actually happened.
 *
 * One day of slack, deliberately: the browser sends the user's *local* date,
 * and a user east of UTC is legitimately living on tomorrow's date as far as
 * this server is concerned. Without the slack, someone in Auckland could not
 * log their own morning.
 */
export const pastOrTodaySchema = isoDateSchema.refine((value) => {
  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() + 1);
  return value <= limit.toISOString().slice(0, 10);
}, 'That date is in the future');

export const upsertActivitySchema = z
  .object({
    date: pastOrTodaySchema.optional(),
    steps: z.number().int().min(0).max(300_000).optional(),
    calories: z.number().int().min(0).max(30_000).optional(),
    activeMinutes: z.number().int().min(0).max(1440).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    waterLiters: z.number().min(0).max(20).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.steps !== undefined ||
      value.calories !== undefined ||
      value.activeMinutes !== undefined ||
      value.sleepHours !== undefined ||
      value.waterLiters !== undefined,
    { message: 'Provide at least one metric to update' },
  );

export const upsertGoalSchema = z
  .object({
    type: z.enum(GOAL_TYPES),
    target: z.number().positive('Target must be greater than zero').max(1_000_000),
  })
  .strict();

export const workoutQuerySchema = z.object({
  type: z.enum(WORKOUT_TYPES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  q: z.string().trim().max(100).optional(),
});

export const startSessionSchema = z.object({ workoutId: z.number().int().positive() }).strict();

export const finishSessionSchema = z
  .object({
    elapsedSec: z.number().int().min(0).max(86_400),
    caloriesBurned: z.number().int().min(0).max(30_000).optional(),
  })
  .strict();

export const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpsertActivityInput = z.infer<typeof upsertActivitySchema>;
export type UpsertGoalInput = z.infer<typeof upsertGoalSchema>;
export type WorkoutQuery = z.infer<typeof workoutQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Derived view models shared by server and client                            */
/* -------------------------------------------------------------------------- */

export type GoalProgress = Goal & { current: number; percent: number };

export type LeaderboardEntry = {
  userId: number;
  name: string;
  username: string;
  progress: number;
  percent: number;
  rank: number;
};

/**
 * A leaderboard entry as the API presents it.
 *
 * `isSample` marks the generated pace-setter accounts that ship with the seed.
 * They exist so a leaderboard has something on it before anyone else signs up,
 * and the UI says so — a standing you are chasing needs to be honest about
 * whether there is a person on the other end of it.
 */
export type LeaderboardRow = LeaderboardEntry & { isSample: boolean };

export type ChallengeSummary = Challenge & {
  participantCount: number;
  joined: boolean;
  progress: number;
  percent: number;
  daysLeft: number;
};

export type Insight = {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  /** What in the user's data produced this insight — shown in the UI. */
  basis: string;
};
