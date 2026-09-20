/**
 * Single source of truth for the data model.
 *
 * Drizzle tables describe the Postgres shape; the Zod schemas below validate
 * everything crossing the API boundary. Both storage implementations
 * (Postgres and in-memory) conform to the types inferred here.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const GOAL_TYPES = ['steps', 'calories', 'activeMinutes', 'sleep', 'water'] as const;
export const WORKOUT_TYPES = ['cardio', 'strength', 'flexibility', 'hiit', 'yoga'] as const;
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const CHALLENGE_TYPES = ['steps', 'calories', 'activeMinutes', 'workouts'] as const;
export const INSIGHT_TYPES = ['workout', 'nutrition', 'sleep', 'hydration', 'activity'] as const;

export type GoalType = (typeof GOAL_TYPES)[number];
export type WorkoutType = (typeof WORKOUT_TYPES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];
export type InsightType = (typeof INSIGHT_TYPES)[number];

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  heightCm: integer('height_cm'),
  weightKg: real('weight_kg'),
  age: integer('age'),
  location: varchar('location', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const activityStats = pgTable(
  'activity_stats',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Calendar day in YYYY-MM-DD. One row per user per day. */
    date: date('date').notNull(),
    steps: integer('steps').notNull().default(0),
    calories: integer('calories').notNull().default(0),
    activeMinutes: integer('active_minutes').notNull().default(0),
    sleepHours: real('sleep_hours').notNull().default(0),
    waterLiters: real('water_liters').notNull().default(0),
  },
  (t) => [
    unique('activity_stats_user_date').on(t.userId, t.date),
    index('activity_stats_user_idx').on(t.userId),
  ],
);

export const goals = pgTable(
  'goals',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull().$type<GoalType>(),
    target: real('target').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('goals_user_type').on(t.userId, t.type)],
);

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull().$type<WorkoutType>(),
  description: text('description').notNull().default(''),
  difficulty: varchar('difficulty', { length: 20 }).notNull().$type<Difficulty>(),
  durationMin: integer('duration_min').notNull(),
  caloriesBurn: integer('calories_burn').notNull(),
  exercises: jsonb('exercises').notNull().$type<Exercise[]>().default([]),
});

export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workoutId: integer('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    elapsedSec: integer('elapsed_sec').notNull().default(0),
    caloriesBurned: integer('calories_burned').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
  },
  (t) => [index('workout_sessions_user_idx').on(t.userId)],
);

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  type: varchar('type', { length: 20 }).notNull().$type<ChallengeType>(),
  target: real('target').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
});

export const challengeParticipants = pgTable(
  'challenge_participants',
  {
    id: serial('id').primaryKey(),
    challengeId: integer('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('challenge_participants_unique').on(t.challengeId, t.userId)],
);

/* -------------------------------------------------------------------------- */
/* Inferred row types                                                         */
/* -------------------------------------------------------------------------- */

export type Exercise = { name: string; sets: number; reps: number };

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
