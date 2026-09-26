/**
 * Postgres table definitions.
 *
 * Deliberately separate from `schema.ts`, which holds the Zod validators every
 * request touches. Keeping them together meant importing a validator pulled in
 * `drizzle-orm/pg-core` as well -- 355ms of module evaluation on a cold start,
 * measured against 94ms for Express itself, for code only `storage/postgres.ts`
 * ever calls. With no DATABASE_URL set it was 355ms of pure waste on every
 * cold start.
 *
 * `schema.ts` still re-exports the row types inferred from these tables, so
 * nothing outside the Postgres storage layer needs to know this file exists.
 * It reaches them through `import type`, which erases completely -- an inline
 * `{ type X }` specifier would not, because `verbatimModuleSyntax` emits the
 * statement verbatim and the module would load at runtime anyway.
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
import type { ChallengeType, Difficulty, GoalType, WorkoutType } from './enums.js';

/** Shape stored in the `exercises` JSONB column. */
export type Exercise = { name: string; sets: number; reps: number };

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
