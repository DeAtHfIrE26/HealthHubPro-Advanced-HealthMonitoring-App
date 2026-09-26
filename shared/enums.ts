/**
 * The closed sets of values the data model allows.
 *
 * Its own module because both `tables.ts` and `schema.ts` need them: the table
 * definitions narrow columns with `$type<GoalType>()`, and the Zod validators
 * build `z.enum()` from the same arrays at runtime. Importing one from the
 * other would either recreate the cold-start cost this split removed, or leave
 * a circular import for a future reader to puzzle over. This file has no
 * imports at all, so neither happens.
 *
 * `schema.ts` re-exports everything here, so existing `@shared/schema` imports
 * keep working.
 */
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
