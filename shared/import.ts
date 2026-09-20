/**
 * Shared contract for bulk activity import.
 *
 * Large exports (an Apple Health `export.xml` is routinely hundreds of MB)
 * are parsed and aggregated to daily totals in the browser. Only these
 * compact rows cross the wire, which keeps the request inside both the JSON
 * body limit and any serverless payload cap.
 */
import { z } from 'zod';
import { isoDateSchema } from './schema.js';

/** Largest number of days accepted in a single request. Clients chunk. */
export const IMPORT_MAX_DAYS = 400;

export const importDaySchema = z
  .object({
    date: isoDateSchema,
    steps: z.number().int().min(0).max(300_000).optional(),
    calories: z.number().int().min(0).max(30_000).optional(),
    activeMinutes: z.number().int().min(0).max(1440).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    waterLiters: z.number().min(0).max(20).optional(),
  })
  .strict();

export const importRequestSchema = z
  .object({
    days: z.array(importDaySchema).min(1).max(IMPORT_MAX_DAYS),
    /**
     * merge     — only fill metrics that are currently zero (default; safe)
     * overwrite — replace whatever is stored for that day
     */
    strategy: z.enum(['merge', 'overwrite']).default('merge'),
  })
  .strict();

export type ImportDay = z.infer<typeof importDaySchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  /** Earliest and latest dates actually written. */
  range: { from: string; to: string } | null;
};

/* -------------------------------------------------------------------------- */
/* Client-side parse results                                                  */
/* -------------------------------------------------------------------------- */

export type ParseIssue = { line: number; reason: string };

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

/** Which metrics a parse actually produced, for the preview summary. */
export function metricsPresent(days: ImportDay[]): Array<keyof Omit<ImportDay, 'date'>> {
  const keys = Object.keys(METRIC_LABELS) as Array<keyof Omit<ImportDay, 'date'>>;
  return keys.filter((k) => days.some((d) => d[k] !== undefined));
}

export function dateRange(days: ImportDay[]): { from: string; to: string } | null {
  if (days.length === 0) return null;
  const sorted = days.map((d) => d.date).sort();
  return { from: sorted[0]!, to: sorted[sorted.length - 1]! };
}
