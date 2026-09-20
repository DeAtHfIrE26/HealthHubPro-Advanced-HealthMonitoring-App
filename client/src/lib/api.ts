import type {
  ActivityStat,
  Challenge,
  ChallengeSummary,
  Goal,
  GoalProgress,
  Insight,
  LeaderboardRow,
  PublicUser,
  Workout,
  WorkoutSession,
} from '@shared/schema';

/** Field-level validation errors, keyed by form field name. */
export type FieldErrors = Record<string, string[] | undefined>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = {
  error?: string;
  details?: { fieldErrors?: FieldErrors } & FieldErrors;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    // Network-level failure: offline, DNS, connection refused.
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(response.status, 'The server returned an unexpected response.');
  }

  if (!response.ok) {
    const parsed = body as ApiErrorBody;
    throw new ApiError(
      response.status,
      parsed.error ?? 'Something went wrong.',
      parsed.details?.fieldErrors,
    );
  }

  return body as T;
}

const get = <T>(path: string) => request<T>(path);
const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const api = {
  health: () => get<{ status: string; persistent: boolean }>('/health'),

  register: (input: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => send<{ user: PublicUser }>('POST', '/auth/register', input),
  login: (input: { username: string; password: string }) =>
    send<{ user: PublicUser }>('POST', '/auth/login', input),
  demoLogin: () => send<{ user: PublicUser }>('POST', '/auth/demo'),
  logout: () => send<{ ok: true }>('POST', '/auth/logout'),
  me: () => get<{ user: PublicUser | null }>('/auth/me'),
  updateProfile: (patch: Record<string, unknown>) =>
    send<{ user: PublicUser }>('PATCH', '/users/me', patch),

  activity: (date?: string) =>
    get<{ activity: ActivityStat }>(`/activity${date ? `?date=${date}` : ''}`),
  saveActivity: (patch: Record<string, number | string>) =>
    send<{ activity: ActivityStat }>('PUT', '/activity', patch),
  history: (days: number) => get<{ history: ActivityStat[] }>(`/activity/history?days=${days}`),

  goals: () => get<{ goals: GoalProgress[] }>('/goals'),
  saveGoal: (input: { type: string; target: number }) =>
    send<{ goal: Goal }>('PUT', '/goals', input),

  workouts: (params: { type?: string; difficulty?: string; q?: string }) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
    const qs = search.toString();
    return get<{ workouts: Workout[] }>(`/workouts${qs ? `?${qs}` : ''}`);
  },
  workout: (id: number) => get<{ workout: Workout }>(`/workouts/${id}`),

  sessions: (limit = 10) =>
    get<{ sessions: Array<WorkoutSession & { workout: Workout }> }>(`/sessions?limit=${limit}`),
  startSession: (workoutId: number) =>
    send<{ session: WorkoutSession }>('POST', '/sessions', { workoutId }),
  finishSession: (id: number, elapsedSec: number) =>
    send<{ session: WorkoutSession }>('POST', `/sessions/${id}/finish`, { elapsedSec }),

  challenges: () => get<{ challenges: ChallengeSummary[] }>('/challenges'),
  leaderboard: (id: number) =>
    get<{ challenge: Challenge; leaderboard: LeaderboardRow[] }>(`/challenges/${id}/leaderboard`),
  joinChallenge: (id: number) => send<{ ok: true }>('POST', `/challenges/${id}/join`),
  leaveChallenge: (id: number) => send<{ ok: true }>('DELETE', `/challenges/${id}/join`),

  insights: () => get<{ insights: Insight[]; generatedAt: string }>('/insights'),
};
