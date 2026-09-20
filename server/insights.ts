/**
 * Rule-based insight engine.
 *
 * Deliberately NOT an LLM. Every insight is derived from the user's own
 * numbers and carries a `basis` string naming the data behind it, so nothing
 * here is unexplainable. This keeps the demo free to run and honest about
 * what it is.
 */
import type { ActivityStat, Goal, Insight, InsightType } from '../shared/schema.js';

type Candidate = Insight & { priority: number };

const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Population standard deviation. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export type InsightInput = {
  /** Oldest-first daily history. 14+ days gives the trend rules something to work with. */
  history: ActivityStat[];
  goals: Goal[];
  /** Completed workouts in the last 14 days. */
  recentWorkouts: number;
};

export function generateInsights({ history, goals, recentWorkouts }: InsightInput): Insight[] {
  if (history.length === 0) return [emptyStateInsight()];

  const goalFor = (type: Goal['type']): number | undefined =>
    goals.find((g) => g.type === type)?.target;

  const last7 = history.slice(-7);
  const prev7 = history.slice(-14, -7);

  const steps7 = mean(last7.map((d) => d.steps));
  const stepsPrev7 = mean(prev7.map((d) => d.steps));
  const active7 = mean(last7.map((d) => d.activeMinutes));
  const sleep7 = mean(last7.map((d) => d.sleepHours));
  const sleepSpread = stdDev(last7.map((d) => d.sleepHours));
  const water7 = mean(last7.map((d) => d.waterLiters));
  const calories7 = mean(last7.map((d) => d.calories));

  const candidates: Candidate[] = [];

  /* ------------------------------------------------------------ activity */

  if (prev7.length >= 7 && stepsPrev7 > 0) {
    const delta = ((steps7 - stepsPrev7) / stepsPrev7) * 100;
    if (delta <= -15) {
      candidates.push({
        id: 'steps-declining',
        type: 'activity',
        priority: 90,
        title: 'Your step count is sliding',
        body: `You averaged ${round(steps7).toLocaleString()} steps a day this week, down ${round(Math.abs(delta))}% from ${round(stepsPrev7).toLocaleString()} the week before. A single 20-minute walk a day closes most of that gap — it is easier to restart now than after another quiet week.`,
        basis: `7-day step average vs the previous 7 days`,
      });
    } else if (delta >= 15) {
      candidates.push({
        id: 'steps-climbing',
        type: 'activity',
        priority: 70,
        title: 'Step count is trending up',
        body: `Up ${round(delta)}% week on week, from ${round(stepsPrev7).toLocaleString()} to ${round(steps7).toLocaleString()} steps a day. This is the point where people usually overreach — hold this volume for another week before adding more.`,
        basis: `7-day step average vs the previous 7 days`,
      });
    }
  }

  const stepGoal = goalFor('steps');
  if (stepGoal) {
    const hitDays = last7.filter((d) => d.steps >= stepGoal).length;
    if (hitDays === 0 && last7.length >= 3) {
      candidates.push({
        id: 'steps-goal-unmet',
        type: 'activity',
        priority: 85,
        title: 'Your step goal may be set too high',
        body: `You have not reached ${stepGoal.toLocaleString()} steps on any of the last ${last7.length} days, averaging ${round(steps7).toLocaleString()}. A goal you never hit stops being information. Consider setting it near ${round((steps7 * 1.1) / 500) * 500} and raising it once that is routine.`,
        basis: `${hitDays} of ${last7.length} days met the ${stepGoal.toLocaleString()} step goal`,
      });
    } else if (hitDays >= 6) {
      candidates.push({
        id: 'steps-goal-easy',
        type: 'activity',
        priority: 60,
        title: 'Time to raise your step goal',
        body: `You hit ${stepGoal.toLocaleString()} steps on ${hitDays} of the last ${last7.length} days. That is no longer a stretch — try ${round((stepGoal * 1.15) / 500) * 500}.`,
        basis: `${hitDays} of ${last7.length} days met the ${stepGoal.toLocaleString()} step goal`,
      });
    }
  }

  /* --------------------------------------------------------------- sleep */

  if (sleep7 > 0 && sleep7 < 7) {
    candidates.push({
      id: 'sleep-short',
      type: 'sleep',
      priority: 95,
      title: 'You are running a sleep deficit',
      body: `${round(sleep7, 1)} hours a night on average this week. Under seven hours blunts recovery and makes training feel harder than it is. Pulling bedtime forward by 30 minutes is worth more than any change to your workouts right now.`,
      basis: `7-day average sleep of ${round(sleep7, 1)}h`,
    });
  } else if (sleepSpread >= 1.5) {
    candidates.push({
      id: 'sleep-irregular',
      type: 'sleep',
      priority: 75,
      title: 'Your sleep timing is inconsistent',
      body: `Your nightly sleep varied by about ${round(sleepSpread, 1)} hours around a ${round(sleep7, 1)}-hour average. Consistency matters nearly as much as duration — a fixed wake time, including weekends, is the usual fix.`,
      basis: `standard deviation of ${round(sleepSpread, 1)}h across 7 nights`,
    });
  }

  /* ----------------------------------------------------------- hydration */

  const waterGoal = goalFor('water') ?? 2.5;
  if (water7 > 0 && water7 < waterGoal * 0.8) {
    candidates.push({
      id: 'water-low',
      type: 'hydration',
      priority: 65,
      title: 'Hydration is below your target',
      body: `You averaged ${round(water7, 1)}L a day against a ${round(waterGoal, 1)}L goal. Front-loading — a glass on waking and one with each meal — closes this without thinking about it.`,
      basis: `7-day average water intake vs your ${round(waterGoal, 1)}L goal`,
    });
  }

  /* -------------------------------------------------------------- workout */

  if (recentWorkouts === 0) {
    candidates.push({
      id: 'workouts-none',
      type: 'workout',
      priority: 88,
      title: 'No logged workouts in two weeks',
      body: `Your daily movement is still being tracked, but no structured session has been completed in 14 days. Start with one 20-minute session this week — Sunrise Cardio or Mobility Reset are the lowest-friction options in the catalogue.`,
      basis: 'completed workout sessions in the last 14 days',
    });
  } else if (recentWorkouts >= 8) {
    candidates.push({
      id: 'workouts-heavy',
      type: 'workout',
      priority: 72,
      title: 'Consider a deload week',
      body: `${recentWorkouts} sessions in 14 days is a high volume. Paired with ${round(sleep7, 1)}h of sleep, the limiting factor is likely recovery rather than effort. Swapping one hard session for Deep Stretch is usually enough.`,
      basis: `${recentWorkouts} completed sessions in 14 days`,
    });
  } else if (recentWorkouts <= 2) {
    candidates.push({
      id: 'workouts-light',
      type: 'workout',
      priority: 62,
      title: 'Room for one more session a week',
      body: `You completed ${recentWorkouts} session${recentWorkouts === 1 ? '' : 's'} in the last 14 days. Adding a single strength session — Full Body Strength covers everything in 45 minutes — would meaningfully change your trajectory.`,
      basis: `${recentWorkouts} completed sessions in 14 days`,
    });
  }

  /* ----------------------------------------------------------- nutrition */

  // Gated on genuinely high training volume. Firing this whenever any
  // activity exists made it an always-on card that said nothing specific,
  // which is exactly the filler this engine is meant to avoid.
  if (calories7 > 0 && active7 >= 45) {
    candidates.push({
      id: 'nutrition-fuelling',
      type: 'nutrition',
      priority: 50,
      title: 'Match intake to your active days',
      body: `You are burning around ${round(calories7).toLocaleString()} calories a day across ${round(active7)} active minutes. Protein around 1.6g per kg of bodyweight, weighted toward the hours after your hardest sessions, is the highest-leverage change most people can make here.`,
      basis: `7-day averages: ${round(calories7).toLocaleString()} kcal, ${round(active7)} active minutes`,
    });
  }

  if (candidates.length === 0) return [steadyStateInsight(steps7, sleep7)];

  return candidates
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map(({ priority: _priority, ...insight }) => insight);
}

function emptyStateInsight(): Insight {
  return {
    id: 'no-data',
    type: 'activity',
    title: 'Log a day to get started',
    body: 'Insights are generated from your own activity. Record steps, sleep and water for a few days and specific recommendations will appear here.',
    basis: 'no activity recorded yet',
  };
}

function steadyStateInsight(steps: number, sleep: number): Insight {
  return {
    id: 'steady',
    type: 'activity',
    title: 'Everything is on track',
    body: `Averaging ${round(steps).toLocaleString()} steps and ${round(sleep, 1)} hours of sleep with no concerning trends this week. Nothing needs changing — keep logging and this page will flag it when something shifts.`,
    basis: '7-day averages within expected ranges',
  };
}

export const INSIGHT_LABELS: Record<InsightType, string> = {
  activity: 'Activity',
  sleep: 'Sleep',
  hydration: 'Hydration',
  workout: 'Training',
  nutrition: 'Nutrition',
};
