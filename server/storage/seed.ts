/**
 * Deterministic seed data.
 *
 * Everything here is generated from a fixed PRNG seed, so the demo looks the
 * same on every boot and the integration tests can assert exact numbers.
 * Dates are relative to `today` so the demo never looks stale.
 */
import bcrypt from 'bcryptjs';
import type {
  ChallengeType,
  Difficulty,
  Exercise,
  GoalType,
  WorkoutType,
} from '../../shared/schema';

export const DEMO_USERNAME = 'demo';
export const DEMO_PASSWORD = 'demo1234';

/** bcrypt cost. 10 keeps seeding fast enough for a cold serverless start. */
export const BCRYPT_ROUNDS = 10;

export type SeedUser = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  heightCm: number;
  weightKg: number;
  age: number;
  location: string;
};

export type SeedWorkout = {
  name: string;
  type: WorkoutType;
  description: string;
  difficulty: Difficulty;
  durationMin: number;
  caloriesBurn: number;
  exercises: Exercise[];
};

export type SeedChallenge = {
  name: string;
  description: string;
  type: ChallengeType;
  target: number;
  startDate: string;
  endDate: string;
};

export type SeedActivity = {
  username: string;
  date: string;
  steps: number;
  calories: number;
  activeMinutes: number;
  sleepHours: number;
  waterLiters: number;
};

export type SeedData = {
  users: SeedUser[];
  workouts: SeedWorkout[];
  challenges: SeedChallenge[];
  activity: SeedActivity[];
  goals: Array<{ username: string; type: GoalType; target: number }>;
  participants: Array<{ challengeName: string; username: string }>;
  sessions: Array<{
    username: string;
    workoutName: string;
    daysAgo: number;
    elapsedSec: number;
    caloriesBurned: number;
  }>;
};

/** mulberry32 — small, fast, deterministic. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const WORKOUTS: SeedWorkout[] = [
  {
    name: 'Sunrise Cardio',
    type: 'cardio',
    description: 'A brisk full-body warm-up to get your heart rate up before the day starts.',
    difficulty: 'beginner',
    durationMin: 20,
    caloriesBurn: 180,
    exercises: [
      { name: 'Jumping jacks', sets: 3, reps: 20 },
      { name: 'High knees', sets: 3, reps: 30 },
      { name: 'Mountain climbers', sets: 3, reps: 20 },
    ],
  },
  {
    name: 'Full Body Strength',
    type: 'strength',
    description: 'Compound movements hitting every major muscle group in under an hour.',
    difficulty: 'intermediate',
    durationMin: 45,
    caloriesBurn: 340,
    exercises: [
      { name: 'Goblet squat', sets: 4, reps: 10 },
      { name: 'Push-up', sets: 4, reps: 12 },
      { name: 'Bent-over row', sets: 4, reps: 10 },
      { name: 'Romanian deadlift', sets: 3, reps: 10 },
    ],
  },
  {
    name: 'HIIT Burner',
    type: 'hiit',
    description: 'Twenty minutes of work-to-rest intervals. Short, unpleasant, effective.',
    difficulty: 'advanced',
    durationMin: 20,
    caloriesBurn: 300,
    exercises: [
      { name: 'Burpee', sets: 5, reps: 12 },
      { name: 'Jump squat', sets: 5, reps: 15 },
      { name: 'Plank to shoulder tap', sets: 5, reps: 20 },
    ],
  },
  {
    name: 'Evening Yoga Flow',
    type: 'yoga',
    description: 'A slow vinyasa sequence to unwind and loosen the hips and spine.',
    difficulty: 'beginner',
    durationMin: 30,
    caloriesBurn: 120,
    exercises: [
      { name: 'Sun salutation A', sets: 3, reps: 5 },
      { name: 'Low lunge', sets: 2, reps: 8 },
      { name: "Pigeon pose", sets: 2, reps: 6 },
    ],
  },
  {
    name: 'Core Stability',
    type: 'strength',
    description: 'Anti-rotation and bracing work that makes everything else easier.',
    difficulty: 'intermediate',
    durationMin: 25,
    caloriesBurn: 160,
    exercises: [
      { name: 'Dead bug', sets: 3, reps: 12 },
      { name: 'Pallof press', sets: 3, reps: 10 },
      { name: 'Hollow hold', sets: 3, reps: 30 },
    ],
  },
  {
    name: 'Mobility Reset',
    type: 'flexibility',
    description: 'Joint-by-joint mobility for anyone who sits at a desk all day.',
    difficulty: 'beginner',
    durationMin: 15,
    caloriesBurn: 70,
    exercises: [
      { name: 'Thoracic rotation', sets: 2, reps: 10 },
      { name: 'Hip 90/90 switch', sets: 3, reps: 8 },
      { name: 'Ankle rock', sets: 2, reps: 12 },
    ],
  },
  {
    name: 'Tempo Run Intervals',
    type: 'cardio',
    description: 'Five by four minutes at threshold pace with ninety seconds easy between.',
    difficulty: 'advanced',
    durationMin: 40,
    caloriesBurn: 420,
    exercises: [
      { name: 'Threshold interval', sets: 5, reps: 4 },
      { name: 'Recovery jog', sets: 5, reps: 2 },
    ],
  },
  {
    name: 'Upper Body Push',
    type: 'strength',
    description: 'Chest, shoulders and triceps with a gradual load progression.',
    difficulty: 'intermediate',
    durationMin: 40,
    caloriesBurn: 280,
    exercises: [
      { name: 'Bench press', sets: 4, reps: 8 },
      { name: 'Overhead press', sets: 4, reps: 8 },
      { name: 'Dip', sets: 3, reps: 10 },
    ],
  },
  {
    name: 'Low Impact Walk',
    type: 'cardio',
    description: 'Thirty-five easy minutes. The session you actually do on a bad day.',
    difficulty: 'beginner',
    durationMin: 35,
    caloriesBurn: 140,
    exercises: [{ name: 'Steady walk', sets: 1, reps: 35 }],
  },
  {
    name: 'Deep Stretch',
    type: 'flexibility',
    description: 'Long holds for hamstrings, hips and shoulders. Best after a hard session.',
    difficulty: 'beginner',
    durationMin: 20,
    caloriesBurn: 80,
    exercises: [
      { name: 'Seated forward fold', sets: 2, reps: 60 },
      { name: 'Couch stretch', sets: 2, reps: 60 },
      { name: 'Thread the needle', sets: 2, reps: 45 },
    ],
  },
];

const COMPANIONS = [
  { username: 'ava_r', firstName: 'Ava', lastName: 'Restrepo', location: 'Lisbon', bias: 1.18 },
  { username: 'kenji_t', firstName: 'Kenji', lastName: 'Tanaka', location: 'Osaka', bias: 1.06 },
  { username: 'nadia_s', firstName: 'Nadia', lastName: 'Sharif', location: 'Toronto', bias: 0.97 },
  { username: 'marcus_o', firstName: 'Marcus', lastName: 'Okonkwo', location: 'Leeds', bias: 0.89 },
  { username: 'lena_v', firstName: 'Lena', lastName: 'Vogel', location: 'Berlin', bias: 0.81 },
];

/** One day of plausible activity. Weekends skew higher; Mondays lower. */
function dayActivity(rng: () => number, date: string, bias: number): Omit<SeedActivity, 'username'> {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekendLift = weekday === 0 || weekday === 6 ? 1.25 : 1;
  const mondaySlump = weekday === 1 ? 0.82 : 1;
  const shape = weekendLift * mondaySlump * bias;

  const steps = Math.round((5200 + rng() * 6800) * shape);
  const activeMinutes = Math.round((22 + rng() * 48) * shape);
  const calories = Math.round(steps * 0.041 + activeMinutes * 4.6 + rng() * 60);
  const sleepHours = Math.round((5.9 + rng() * 2.6) * 10) / 10;
  const waterLiters = Math.round((1.3 + rng() * 1.7) * 10) / 10;

  return { date, steps, calories, activeMinutes, sleepHours, waterLiters };
}

export const SEED_HISTORY_DAYS = 30;

export async function buildSeed(today: string = todayIso()): Promise<SeedData> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const users: SeedUser[] = [
    {
      username: DEMO_USERNAME,
      email: 'demo@healthhubpro.app',
      firstName: 'Demo',
      lastName: 'Explorer',
      passwordHash,
      heightCm: 176,
      weightKg: 72.5,
      age: 29,
      location: 'Remote',
    },
    ...COMPANIONS.map((c) => ({
      username: c.username,
      email: `${c.username}@healthhubpro.app`,
      firstName: c.firstName,
      lastName: c.lastName,
      passwordHash,
      heightCm: 165 + Math.round(c.bias * 12),
      weightKg: 62 + Math.round(c.bias * 10),
      age: 26 + Math.round(c.bias * 6),
      location: c.location,
    })),
  ];

  const activity: SeedActivity[] = [];
  const rng = makeRng(20260920);

  for (let i = SEED_HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    activity.push({ username: DEMO_USERNAME, ...dayActivity(rng, date, 1) });
    for (const c of COMPANIONS) {
      activity.push({ username: c.username, ...dayActivity(rng, date, c.bias) });
    }
  }

  const challengeStart = addDays(today, -4);
  const challenges: SeedChallenge[] = [
    {
      name: '70K Step Week',
      description: 'Log seventy thousand steps across the week. Roughly ten thousand a day.',
      type: 'steps',
      target: 70_000,
      startDate: challengeStart,
      endDate: addDays(challengeStart, 6),
    },
    {
      name: 'Active Minutes Sprint',
      description: 'Three hundred active minutes in ten days. Any movement counts.',
      type: 'activeMinutes',
      target: 300,
      startDate: addDays(today, -2),
      endDate: addDays(today, 7),
    },
    {
      name: 'Five Session Fortnight',
      description: 'Complete five workouts in two weeks. Consistency over intensity.',
      type: 'workouts',
      target: 5,
      startDate: addDays(today, -6),
      endDate: addDays(today, 7),
    },
    {
      name: 'Burn 8000',
      description: 'Eight thousand calories burned this month across everything you do.',
      type: 'calories',
      target: 8000,
      startDate: addDays(today, -12),
      endDate: addDays(today, 15),
    },
  ];

  const participants = challenges.flatMap((ch) => [
    { challengeName: ch.name, username: DEMO_USERNAME },
    ...COMPANIONS.map((c) => ({ challengeName: ch.name, username: c.username })),
  ]);

  const goals: SeedData['goals'] = [
    { username: DEMO_USERNAME, type: 'steps', target: 10_000 },
    { username: DEMO_USERNAME, type: 'calories', target: 650 },
    { username: DEMO_USERNAME, type: 'activeMinutes', target: 45 },
    { username: DEMO_USERNAME, type: 'sleep', target: 8 },
    { username: DEMO_USERNAME, type: 'water', target: 2.5 },
  ];

  const sessions: SeedData['sessions'] = [
    { username: DEMO_USERNAME, workoutName: 'Full Body Strength', daysAgo: 1, elapsedSec: 2_610, caloriesBurned: 328 },
    { username: DEMO_USERNAME, workoutName: 'Evening Yoga Flow', daysAgo: 2, elapsedSec: 1_800, caloriesBurned: 118 },
    { username: DEMO_USERNAME, workoutName: 'HIIT Burner', daysAgo: 4, elapsedSec: 1_215, caloriesBurned: 296 },
    { username: DEMO_USERNAME, workoutName: 'Tempo Run Intervals', daysAgo: 6, elapsedSec: 2_340, caloriesBurned: 401 },
    { username: DEMO_USERNAME, workoutName: 'Mobility Reset', daysAgo: 8, elapsedSec: 900, caloriesBurned: 68 },
  ];

  return { users, workouts: WORKOUTS, challenges, activity, goals, participants, sessions };
}
