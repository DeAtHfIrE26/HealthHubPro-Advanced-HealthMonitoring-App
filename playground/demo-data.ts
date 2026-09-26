import type { ActivityStat, GoalProgress } from '../src/types';

/**
 * Synthetic data for the playground.
 *
 * Entirely generated — no real person's activity appears here or anywhere in
 * this repository. The generator is seeded so the playground looks the same
 * on every reload, which makes it usable as a visual reference: a chart whose
 * bars jump around on refresh is no good for checking a layout change.
 */

/** mulberry32: small, fast, and identical across runs for a given seed. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Local date, not UTC: the components label days as the viewer sees them.
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * `days` of plausible activity, ending today.
 *
 * Shaped rather than uniform — weekends run higher and Mondays lower — so
 * the chart has something to show. A flat random series makes a bar chart
 * look broken even when it is not.
 */
export function makeHistory(days = 30, seed = 20_260_926): ActivityStat[] {
  const rng = seededRandom(seed);
  const out: ActivityStat[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = isoDaysAgo(i);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const shape = (weekday === 0 || weekday === 6 ? 1.25 : 1) * (weekday === 1 ? 0.82 : 1);

    const steps = Math.round((5200 + rng() * 6800) * shape);
    const activeMinutes = Math.min(1440, Math.round((22 + rng() * 48) * shape));

    out.push({
      date,
      steps,
      activeMinutes,
      calories: Math.round(steps * 0.041 + activeMinutes * 4.6 + rng() * 60),
      sleepHours: Math.round((5.9 + rng() * 2.6) * 10) / 10,
      waterLiters: Math.round((1.3 + rng() * 1.7) * 10) / 10,
    });
  }

  return out;
}

/**
 * Goals derived from the series, so the rings and the chart agree.
 *
 * Targets sit a little above the generator's usual day rather than at round
 * numbers. Round targets against this data put every ring past 100% — one
 * read 180% — which makes the component look broken rather than finished.
 * A demo should show the ordinary case: mostly close, one comfortably over,
 * one short.
 */
export function makeGoals(history: ActivityStat[]): GoalProgress[] {
  const today = history.at(-1);
  const targets: Array<{ type: GoalProgress['type']; target: number; current: number }> = [
    { type: 'steps', target: 14_000, current: today?.steps ?? 0 },
    { type: 'calories', target: 950, current: today?.calories ?? 0 },
    { type: 'activeMinutes', target: 75, current: today?.activeMinutes ?? 0 },
    { type: 'sleep', target: 8, current: today?.sleepHours ?? 0 },
    { type: 'water', target: 3, current: today?.waterLiters ?? 0 },
  ];

  return targets.map((t, i) => ({
    id: i + 1,
    ...t,
    percent: t.target > 0 ? Math.round((t.current / t.target) * 100) : 0,
  }));
}

/** A small Apple Health export, for trying the parser in the browser. */
export const SAMPLE_APPLE_HEALTH = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_GB">
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="${isoDaysAgo(2)} 09:14:00 +0000" value="4120"/>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="${isoDaysAgo(2)} 18:02:00 +0000" value="3980"/>
  <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" sourceName="Watch" unit="kJ" startDate="${isoDaysAgo(2)} 09:14:00 +0000" value="1673.6"/>
  <Record type="HKQuantityTypeIdentifierAppleExerciseTime" sourceName="Watch" unit="min" startDate="${isoDaysAgo(2)} 09:14:00 +0000" value="38"/>
  <Record type="HKQuantityTypeIdentifierDietaryWater" sourceName="iPhone" unit="mL" startDate="${isoDaysAgo(2)} 12:00:00 +0000" value="1800"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="${isoDaysAgo(2)} 23:10:00 +0000" endDate="${isoDaysAgo(1)} 06:40:00 +0000" value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="${isoDaysAgo(2)} 22:30:00 +0000" endDate="${isoDaysAgo(2)} 23:10:00 +0000" value="HKCategoryValueSleepAnalysisInBed"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Watch" unit="count/min" startDate="${isoDaysAgo(1)} 08:00:00 +0000" value="62"/>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="${isoDaysAgo(1)} 10:30:00 +0000" value="9310"/>
</HealthData>`;

/** A CSV in the shape Google Fit and Fitbit export, aliases included. */
export const SAMPLE_CSV = `Date,Step Count,Calories,Move Minutes,Minutes Asleep,Water (ml)
${isoDaysAgo(4)},"11,204",612,52,451,2300
${isoDaysAgo(3)},7890,498,31,402,1900
${isoDaysAgo(2)},13011,701,64,478,2600
not-a-date,999,10,10,10,10
${isoDaysAgo(1)},9455,556,44,420,2100`;
