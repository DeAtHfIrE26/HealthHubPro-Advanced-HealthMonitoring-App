// Validation schemas using Zod
import { z } from 'zod';

// User schema
export const insertUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  profileImage: z.string().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  age: z.number().int().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  role: z.string().default('user')
});

// Activity stats schema
export const insertActivityStatsSchema = z.object({
  userId: z.number().int().positive(),
  steps: z.number().int().nonnegative().optional(),
  calories: z.number().nonnegative().optional(),
  activeMinutes: z.number().int().nonnegative().optional(),
  sleep: z.number().nonnegative().optional(),
  water: z.number().nonnegative().optional(),
  date: z.string().or(z.date()).default(() => new Date())
});

// Goal schema
export const insertGoalSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(['steps', 'calories', 'activeMinutes', 'sleep', 'water', 'weight', 'custom']),
  target: z.number().positive(),
  current: z.number().nonnegative().default(0),
  deadline: z.string().or(z.date()).optional()
});

// Workout schema
export const insertWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['cardio', 'strength', 'flexibility', 'hiit', 'yoga', 'endurance']),
  description: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().int().positive(),
  caloriesBurn: z.number().int().positive(),
  exercises: z.array(
    z.object({
      name: z.string().min(1),
      sets: z.number().int().positive(),
      reps: z.number().int().positive(),
      duration: z.number().int().positive().optional()
    })
  )
});

// Workout session schema
export const insertWorkoutSessionSchema = z.object({
  userId: z.number().int().positive(),
  workoutId: z.number().int().positive(),
  startTime: z.string().or(z.date()).default(() => new Date()),
  endTime: z.string().or(z.date()).nullable().optional(),
  elapsedTime: z.number().nonnegative().optional(),
  caloriesBurned: z.number().nonnegative().optional(),
  heartRate: z.number().int().nonnegative().optional(),
  completed: z.boolean().optional()
});

// Challenge schema
export const insertChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['steps', 'calories', 'activeMinutes', 'workouts', 'custom']),
  target: z.number().positive(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  createdBy: z.number().int().positive()
});

// Challenge participant schema
export const insertChallengeParticipantSchema = z.object({
  challengeId: z.number().int().positive(),
  userId: z.number().int().positive(),
  currentProgress: z.number().nonnegative().default(0)
});

// Recommendation schema
export const insertRecommendationSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(['workout', 'nutrition', 'sleep']),
  content: z.string().min(1)
});
