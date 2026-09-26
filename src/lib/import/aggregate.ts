import type { ImportDay } from '../../types';

export type Metric = keyof Omit<ImportDay, 'date'>;

/** Accumulates per-day totals while a file is streamed through. */
export class DayAccumulator {
  private readonly days = new Map<string, Partial<Record<Metric, number>>>();

  add(date: string, metric: Metric, value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    const day = this.days.get(date) ?? {};
    day[metric] = (day[metric] ?? 0) + value;
    this.days.set(date, day);
  }

  /** Last write wins, rather than summing — for already-daily sources. */
  set(date: string, metric: Metric, value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    const day = this.days.get(date) ?? {};
    day[metric] = value;
    this.days.set(date, day);
  }

  get size(): number {
    return this.days.size;
  }

  /** Rounds to the precision each metric is stored at, sorted by date. */
  toDays(): ImportDay[] {
    const out: ImportDay[] = [];

    for (const [date, totals] of this.days) {
      const day: ImportDay = { date };
      if (totals.steps !== undefined) day.steps = Math.round(totals.steps);
      if (totals.calories !== undefined) day.calories = Math.round(totals.calories);
      if (totals.activeMinutes !== undefined) {
        day.activeMinutes = Math.min(1440, Math.round(totals.activeMinutes));
      }
      if (totals.sleepHours !== undefined) {
        day.sleepHours = Math.min(24, Math.round(totals.sleepHours * 10) / 10);
      }
      if (totals.waterLiters !== undefined) {
        day.waterLiters = Math.min(20, Math.round(totals.waterLiters * 10) / 10);
      }
      // A date with no metrics carries no information.
      if (Object.keys(day).length > 1) out.push(day);
    }

    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
}

/**
 * Reads a File as text in slices, handing each chunk to `onChunk` along with
 * whatever tail the previous call did not consume. Keeps peak memory near the
 * chunk size rather than the file size.
 */
export async function streamText(
  file: File,
  onChunk: (text: string, isLast: boolean) => string,
  onProgress?: (fraction: number) => void,
  chunkSize = 4 * 1024 * 1024,
): Promise<void> {
  let offset = 0;
  let carry = '';

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const text = await file.slice(offset, end).text();
    carry = onChunk(carry + text, end >= file.size);
    offset = end;
    onProgress?.(offset / file.size);
    // Yield so the UI can paint progress between slices.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (file.size === 0) onChunk('', true);
}
