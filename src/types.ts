/**
 * The shapes these components read.
 *
 * Declared here rather than imported from an app, so the library stands on
 * its own. In the application these came from a Drizzle/Zod schema module
 * that also carried the API contract; that module stays private, and this
 * file is the minimum surface the presentational code actually touches.
 */

/** A single day of totals. `date` is `YYYY-MM-DD` in the viewer's own timezone. */
export type ActivityStat = {
  date: string;
  steps: number;
  calories: number;
  activeMinutes: number;
  /** Hours, one decimal. */
  sleepHours: number;
  /** Litres, one decimal. */
  waterLiters: number;
};

export type GoalType = 'steps' | 'calories' | 'activeMinutes' | 'sleep' | 'water';

/** A goal plus where today stands against it. `percent` is 0-100, uncapped above. */
export type GoalProgress = {
  id: number;
  type: GoalType;
  target: number;
  current: number;
  percent: number;
};

/**
 * One day produced by a parser. Every metric is optional: a file that only
 * carries steps must not imply zero for everything else, which would let an
 * import erase data it knows nothing about.
 */
export type ImportDay = {
  date: string;
  steps?: number;
  calories?: number;
  activeMinutes?: number;
  sleepHours?: number;
  waterLiters?: number;
};

export type ParseIssue = {
  /** 1-based source line for CSV; absent when the source has no line structure. */
  line?: number;
  reason: string;
};

export type ParseOutcome = {
  days: ImportDay[];
  /** Rows that could not be read. Reported, never silently dropped. */
  issues: ParseIssue[];
  /** Source records examined, for an honest "read N records" summary. */
  recordsScanned: number;
};

export const METRIC_LABELS: Record<keyof Omit<ImportDay, 'date'>, string> = {
  steps: 'Steps',
  calories: 'Calories',
  activeMinutes: 'Active minutes',
  sleepHours: 'Sleep',
  waterLiters: 'Water',
};

/** Largest batch the reference API accepted; parsers chunk to it. */
export const IMPORT_MAX_DAYS = 400;
