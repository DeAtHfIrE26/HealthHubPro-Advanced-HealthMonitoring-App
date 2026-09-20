import { describe, expect, it } from 'vitest';
import type { ActivityStat, Goal } from '../shared/schema';
import { generateInsights } from './insights';

let nextId = 1;

function day(overrides: Partial<ActivityStat> & { date: string }): ActivityStat {
  return {
    id: nextId++,
    userId: 1,
    steps: 8000,
    calories: 500,
    activeMinutes: 40,
    sleepHours: 8,
    waterLiters: 2.5,
    ...overrides,
  };
}

/** `days` entries ending today, oldest first. */
function history(days: number, shape: (i: number) => Partial<ActivityStat> = () => ({})) {
  return Array.from({ length: days }, (_, i) =>
    day({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, ...shape(i) }),
  );
}

const goal = (type: Goal['type'], target: number): Goal => ({
  id: nextId++,
  userId: 1,
  type,
  target,
  createdAt: new Date(),
});

const ids = (insights: ReturnType<typeof generateInsights>) => insights.map((i) => i.id);

describe('generateInsights', () => {
  it('returns an onboarding insight when there is no data at all', () => {
    const result = generateInsights({ history: [], goals: [], recentWorkouts: 0 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('no-data');
  });

  it('returns a steady-state insight when nothing is noteworthy', () => {
    // Healthy, flat, and no goal to over- or under-shoot: no rule should fire.
    const result = generateInsights({
      history: history(14),
      goals: [],
      recentWorkouts: 4,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('steady');
  });

  it('flags a declining step trend', () => {
    // First week 10000/day, second week 6000/day: a 40% drop.
    const result = generateInsights({
      history: history(14, (i) => ({ steps: i < 7 ? 10_000 : 6_000 })),
      goals: [],
      recentWorkouts: 4,
    });
    expect(ids(result)).toContain('steps-declining');
    expect(result.find((i) => i.id === 'steps-declining')?.body).toContain('40%');
  });

  it('flags an improving step trend', () => {
    const result = generateInsights({
      history: history(14, (i) => ({ steps: i < 7 ? 6_000 : 10_000 })),
      goals: [],
      recentWorkouts: 4,
    });
    expect(ids(result)).toContain('steps-climbing');
  });

  it('does not compare trends without a full two weeks', () => {
    const result = generateInsights({
      history: history(7, () => ({ steps: 3_000 })),
      goals: [],
      recentWorkouts: 4,
    });
    expect(ids(result)).not.toContain('steps-declining');
    expect(ids(result)).not.toContain('steps-climbing');
  });

  it('suggests lowering a step goal that is never met', () => {
    const result = generateInsights({
      history: history(14, () => ({ steps: 4_000 })),
      goals: [goal('steps', 20_000)],
      recentWorkouts: 4,
    });
    expect(ids(result)).toContain('steps-goal-unmet');
  });

  it('suggests raising a step goal met almost every day', () => {
    const result = generateInsights({
      history: history(14, () => ({ steps: 12_000 })),
      goals: [goal('steps', 5_000)],
      recentWorkouts: 4,
    });
    expect(ids(result)).toContain('steps-goal-easy');
  });

  it('flags short sleep ahead of everything else', () => {
    const result = generateInsights({
      history: history(14, () => ({ sleepHours: 5.5 })),
      goals: [],
      recentWorkouts: 4,
    });
    // Sleep carries the highest priority, so it must lead.
    expect(result[0]?.id).toBe('sleep-short');
  });

  it('flags irregular sleep even when the average is fine', () => {
    const result = generateInsights({
      history: history(14, (i) => ({ sleepHours: i % 2 === 0 ? 5.5 : 10 })),
      goals: [],
      recentWorkouts: 4,
    });
    expect(ids(result)).toContain('sleep-irregular');
  });

  it('does not flag both sleep rules at once', () => {
    const result = generateInsights({
      history: history(14, () => ({ sleepHours: 5 })),
      goals: [],
      recentWorkouts: 4,
    });
    const sleepRules = ids(result).filter((id) => id.startsWith('sleep-'));
    expect(sleepRules).toHaveLength(1);
  });

  it('flags low hydration against the user goal', () => {
    const result = generateInsights({
      history: history(14, () => ({ waterLiters: 1 })),
      goals: [goal('water', 3)],
      recentWorkouts: 4,
    });
    expect(ids(result)).toContain('water-low');
  });

  it.each([
    [0, 'workouts-none'],
    [1, 'workouts-light'],
    [9, 'workouts-heavy'],
  ])('maps %i recent workouts to %s', (recentWorkouts, expected) => {
    const result = generateInsights({ history: history(14), goals: [], recentWorkouts });
    expect(ids(result)).toContain(expected);
  });

  it('returns at most five insights', () => {
    const result = generateInsights({
      history: history(14, (i) => ({
        steps: i < 7 ? 15_000 : 3_000,
        sleepHours: 4,
        waterLiters: 0.5,
      })),
      goals: [goal('steps', 30_000), goal('water', 3)],
      recentWorkouts: 0,
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('gives every insight a non-empty basis', () => {
    const result = generateInsights({
      history: history(14, () => ({ sleepHours: 5, waterLiters: 0.8 })),
      goals: [goal('water', 3)],
      recentWorkouts: 0,
    });
    for (const insight of result) {
      expect(insight.basis.length).toBeGreaterThan(0);
      expect(insight.title.length).toBeGreaterThan(0);
      expect(insight.body.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for identical input', () => {
    const input = {
      history: history(14, () => ({ sleepHours: 5 })),
      goals: [],
      recentWorkouts: 0,
    };
    expect(generateInsights(input)).toEqual(generateInsights(input));
  });

  it('survives a single day of data without throwing', () => {
    expect(() =>
      generateInsights({ history: history(1), goals: [], recentWorkouts: 0 }),
    ).not.toThrow();
  });

  it('handles all-zero days without dividing by zero', () => {
    const result = generateInsights({
      history: history(14, () => ({
        steps: 0,
        calories: 0,
        activeMinutes: 0,
        sleepHours: 0,
        waterLiters: 0,
      })),
      goals: [goal('steps', 10_000)],
      recentWorkouts: 0,
    });
    for (const insight of result) {
      expect(insight.body).not.toContain('NaN');
      expect(insight.body).not.toContain('Infinity');
    }
  });
});
