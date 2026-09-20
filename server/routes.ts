import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import {
  finishSessionSchema,
  historyQuerySchema,
  isoDateSchema,
  loginSchema,
  registerSchema,
  startSessionSchema,
  toPublicUser,
  updateProfileSchema,
  upsertActivitySchema,
  upsertGoalSchema,
  workoutQuerySchema,
  type ChallengeSummary,
  type GoalProgress,
} from '../shared/schema';
import { clearSession, hashPassword, issueSession, requireAuth, verifyPassword } from './auth';
import { generateInsights } from './insights';
import { getStorage } from './storage';
import { DEMO_PASSWORD, DEMO_USERNAME, addDays, todayIso } from './storage/seed';

/** Wraps an async handler so rejections reach the error middleware. */
const h =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function parseOr400<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'Please check the highlighted fields.', result.error.flatten());
  }
  return result.data;
}

function parseId(raw: string | undefined): number {
  const id = Number.parseInt(raw ?? '', 10);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id.');
  return id;
}

/** Today's value for a goal type, read from that day's activity row. */
function currentForGoal(
  type: GoalProgress['type'],
  today: { steps: number; calories: number; activeMinutes: number; sleepHours: number; waterLiters: number } | null,
): number {
  if (!today) return 0;
  switch (type) {
    case 'steps':
      return today.steps;
    case 'calories':
      return today.calories;
    case 'activeMinutes':
      return today.activeMinutes;
    case 'sleep':
      return today.sleepHours;
    case 'water':
      return today.waterLiters;
  }
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function createRouter(): Router {
  const router = Router();

  /* ----------------------------------------------------------------- meta */

  router.get(
    '/health',
    h(async (_req, res) => {
      const storage = await getStorage();
      res.json({
        status: 'ok',
        persistent: storage.persistent,
        time: new Date().toISOString(),
      });
    }),
  );

  /* ----------------------------------------------------------------- auth */

  router.post(
    '/auth/register',
    h(async (req, res) => {
      const input = parseOr400(registerSchema, req.body);
      const storage = await getStorage();

      if (await storage.getUserByUsername(input.username)) {
        throw new HttpError(409, 'That username is already taken.', {
          fieldErrors: { username: ['That username is already taken.'] },
        });
      }
      if (await storage.getUserByEmail(input.email)) {
        throw new HttpError(409, 'An account with that email already exists.', {
          fieldErrors: { email: ['An account with that email already exists.'] },
        });
      }

      const user = await storage.createUser({
        username: input.username,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
      });

      // Sensible starting goals so the dashboard is never blank.
      await storage.upsertGoal(user.id, 'steps', 10_000);
      await storage.upsertGoal(user.id, 'calories', 600);
      await storage.upsertGoal(user.id, 'activeMinutes', 30);
      await storage.upsertGoal(user.id, 'sleep', 8);
      await storage.upsertGoal(user.id, 'water', 2.5);

      issueSession(res, user.id);
      res.status(201).json({ user: toPublicUser(user) });
    }),
  );

  router.post(
    '/auth/login',
    h(async (req, res) => {
      const input = parseOr400(loginSchema, req.body);
      const storage = await getStorage();
      const user = await storage.getUserByUsername(input.username);

      // Same response whether the user is missing or the password is wrong.
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new HttpError(401, 'Incorrect username or password.');
      }

      issueSession(res, user.id);
      res.json({ user: toPublicUser(user) });
    }),
  );

  /** One-click demo sign-in. No credentials required from the visitor. */
  router.post(
    '/auth/demo',
    h(async (_req, res) => {
      const storage = await getStorage();
      const user = await storage.getUserByUsername(DEMO_USERNAME);
      if (!user) throw new HttpError(503, 'The demo account is unavailable.');

      issueSession(res, user.id);
      res.json({ user: toPublicUser(user), credentials: { username: DEMO_USERNAME, password: DEMO_PASSWORD } });
    }),
  );

  router.post('/auth/logout', (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  router.get('/auth/me', (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }
    res.json({ user: toPublicUser(req.user) });
  });

  /* ---------------------------------------------------------------- users */

  router.patch(
    '/users/me',
    requireAuth,
    h(async (req, res) => {
      const patch = parseOr400(updateProfileSchema, req.body);
      const storage = await getStorage();
      const updated = await storage.updateUser(req.user!.id, patch);
      if (!updated) throw new HttpError(404, 'Account not found.');
      res.json({ user: toPublicUser(updated) });
    }),
  );

  /* ------------------------------------------------------------- activity */

  router.get(
    '/activity',
    requireAuth,
    h(async (req, res) => {
      const date = req.query.date ? parseOr400(isoDateSchema, req.query.date) : todayIso();
      const storage = await getStorage();
      const stat = await storage.getActivityForDate(req.user!.id, date);
      res.json({
        activity: stat ?? {
          id: -1,
          userId: req.user!.id,
          date,
          steps: 0,
          calories: 0,
          activeMinutes: 0,
          sleepHours: 0,
          waterLiters: 0,
        },
      });
    }),
  );

  router.put(
    '/activity',
    requireAuth,
    h(async (req, res) => {
      const { date, ...metrics } = parseOr400(upsertActivitySchema, req.body);
      const storage = await getStorage();
      const activity = await storage.upsertActivity(req.user!.id, date ?? todayIso(), metrics);
      res.json({ activity });
    }),
  );

  router.get(
    '/activity/history',
    requireAuth,
    h(async (req, res) => {
      const { days } = parseOr400(historyQuerySchema, req.query);
      const storage = await getStorage();
      const history = await storage.getActivityHistory(req.user!.id, days, todayIso());
      res.json({ history });
    }),
  );

  /* ---------------------------------------------------------------- goals */

  router.get(
    '/goals',
    requireAuth,
    h(async (req, res) => {
      const storage = await getStorage();
      const [goals, today] = await Promise.all([
        storage.getGoals(req.user!.id),
        storage.getActivityForDate(req.user!.id, todayIso()),
      ]);

      const withProgress: GoalProgress[] = goals.map((goal) => {
        const current = currentForGoal(goal.type, today);
        return {
          ...goal,
          current,
          percent: goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0,
        };
      });

      res.json({ goals: withProgress });
    }),
  );

  router.put(
    '/goals',
    requireAuth,
    h(async (req, res) => {
      const { type, target } = parseOr400(upsertGoalSchema, req.body);
      const storage = await getStorage();
      const goal = await storage.upsertGoal(req.user!.id, type, target);
      res.json({ goal });
    }),
  );

  /* ------------------------------------------------------------- workouts */

  router.get(
    '/workouts',
    h(async (req, res) => {
      const filter = parseOr400(workoutQuerySchema, req.query);
      const storage = await getStorage();
      res.json({ workouts: await storage.listWorkouts(filter) });
    }),
  );

  router.get(
    '/workouts/:id',
    h(async (req, res) => {
      const storage = await getStorage();
      const workout = await storage.getWorkout(parseId(req.params.id));
      if (!workout) throw new HttpError(404, 'That workout does not exist.');
      res.json({ workout });
    }),
  );

  /* ------------------------------------------------------------- sessions */

  router.get(
    '/sessions',
    requireAuth,
    h(async (req, res) => {
      const { limit } = parseOr400(
        z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
        req.query,
      );
      const storage = await getStorage();
      res.json({ sessions: await storage.listSessions(req.user!.id, limit) });
    }),
  );

  router.post(
    '/sessions',
    requireAuth,
    h(async (req, res) => {
      const { workoutId } = parseOr400(startSessionSchema, req.body);
      const storage = await getStorage();
      const workout = await storage.getWorkout(workoutId);
      if (!workout) throw new HttpError(404, 'That workout does not exist.');
      const session = await storage.startSession(req.user!.id, workoutId);
      res.status(201).json({ session });
    }),
  );

  router.post(
    '/sessions/:id/finish',
    requireAuth,
    h(async (req, res) => {
      const id = parseId(req.params.id);
      const input = parseOr400(finishSessionSchema, req.body);
      const storage = await getStorage();

      const existing = await storage.getSession(id);
      if (!existing) throw new HttpError(404, 'That session does not exist.');
      // Ownership check — a session id alone must not grant access.
      if (existing.userId !== req.user!.id) {
        throw new HttpError(403, 'That session belongs to someone else.');
      }
      if (existing.completed) throw new HttpError(409, 'That session is already finished.');

      const workout = await storage.getWorkout(existing.workoutId);
      const estimated = workout
        ? Math.round((workout.caloriesBurn / Math.max(1, workout.durationMin * 60)) * input.elapsedSec)
        : 0;

      const session = await storage.finishSession(id, {
        elapsedSec: input.elapsedSec,
        caloriesBurned: input.caloriesBurned ?? estimated,
      });
      res.json({ session });
    }),
  );

  /* ----------------------------------------------------------- challenges */

  router.get(
    '/challenges',
    requireAuth,
    h(async (req, res) => {
      const storage = await getStorage();
      const today = todayIso();
      const all = await storage.listChallenges();

      const summaries: ChallengeSummary[] = await Promise.all(
        all.map(async (challenge) => {
          const [participantCount, joined] = await Promise.all([
            storage.countParticipants(challenge.id),
            storage.isParticipant(challenge.id, req.user!.id),
          ]);
          const progress = joined
            ? await storage.getChallengeProgress(challenge, req.user!.id)
            : 0;
          return {
            ...challenge,
            participantCount,
            joined,
            progress,
            percent:
              challenge.target > 0 ? Math.min(100, Math.round((progress / challenge.target) * 100)) : 0,
            daysLeft: Math.max(0, daysBetween(today, challenge.endDate)),
          };
        }),
      );

      res.json({ challenges: summaries });
    }),
  );

  router.get(
    '/challenges/:id/leaderboard',
    requireAuth,
    h(async (req, res) => {
      const id = parseId(req.params.id);
      const storage = await getStorage();
      const challenge = await storage.getChallenge(id);
      if (!challenge) throw new HttpError(404, 'That challenge does not exist.');
      res.json({ challenge, leaderboard: await storage.getLeaderboard(id) });
    }),
  );

  router.post(
    '/challenges/:id/join',
    requireAuth,
    h(async (req, res) => {
      const id = parseId(req.params.id);
      const storage = await getStorage();
      const challenge = await storage.getChallenge(id);
      if (!challenge) throw new HttpError(404, 'That challenge does not exist.');
      await storage.joinChallenge(id, req.user!.id);
      res.status(201).json({ ok: true });
    }),
  );

  router.delete(
    '/challenges/:id/join',
    requireAuth,
    h(async (req, res) => {
      const id = parseId(req.params.id);
      const storage = await getStorage();
      await storage.leaveChallenge(id, req.user!.id);
      res.json({ ok: true });
    }),
  );

  /* -------------------------------------------------------------- insights */

  router.get(
    '/insights',
    requireAuth,
    h(async (req, res) => {
      const storage = await getStorage();
      const today = todayIso();
      const [history, goals, recentWorkouts] = await Promise.all([
        storage.getActivityHistory(req.user!.id, 14, today),
        storage.getGoals(req.user!.id),
        storage.countCompletedSessions(req.user!.id, addDays(today, -13), today),
      ]);

      res.json({
        insights: generateInsights({ history, goals, recentWorkouts }),
        generatedAt: new Date().toISOString(),
      });
    }),
  );

  return router;
}
