import type { ImportDay, ParseIssue, ParseOutcome } from '@shared/import';
import { DayAccumulator, type Metric } from './aggregate.js';

/**
 * Generic daily-CSV parser, tolerant of the column names different exporters
 * use (Google Fit, Fitbit, Garmin, spreadsheets). One row per day.
 */
const COLUMN_ALIASES: Array<{ metric: Metric | 'date'; names: string[]; scale?: number }> = [
  {
    metric: 'date',
    names: ['date', 'day', 'datetime', 'timestamp', 'start time', 'activity date'],
  },
  { metric: 'steps', names: ['steps', 'step count', 'total steps'] },
  {
    metric: 'calories',
    names: [
      'calories',
      'calories burned',
      'active calories',
      'calorie expenditure (kcal)',
      'energy burned',
      'kcal',
    ],
  },
  {
    metric: 'activeMinutes',
    names: [
      'active minutes',
      'activeminutes',
      'exercise minutes',
      'move minutes',
      'very active minutes',
      'fairly active minutes',
    ],
  },
  {
    metric: 'sleepHours',
    names: ['sleep', 'sleep hours', 'hours of sleep', 'time asleep (hours)'],
  },
  {
    metric: 'sleepHours',
    names: ['sleep minutes', 'minutes asleep', 'time asleep (minutes)'],
    scale: 1 / 60,
  },
  { metric: 'waterLiters', names: ['water', 'water litres', 'water liters', 'hydration (l)'] },
  { metric: 'waterLiters', names: ['water ml', 'hydration (ml)', 'water (ml)'], scale: 1 / 1000 },
];

/** Handles quoted fields containing commas. */
function splitRow(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }

  out.push(field);
  return out.map((f) => f.trim());
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY and MM/DD/YYYY, plus a trailing time. */
function normaliseDate(raw: string): string | null {
  const value = raw.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slashed = /^(\d{1,2})[/](\d{1,2})[/](\d{4})/.exec(value);
  if (slashed) {
    const a = Number(slashed[1]);
    const b = Number(slashed[2]);
    // Unambiguous only when one part exceeds 12; otherwise assume D/M/Y.
    const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${slashed[3]}-${pad(month)}-${pad(day)}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  return null;
}

function toNumber(raw: string): number | null {
  if (raw === '' || raw === '-') return null;
  // Strip thousands separators and any trailing unit.
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.\-+eE]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function parseCsv(file: File): Promise<ParseOutcome> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const issues: ParseIssue[] = [];

  if (lines.length < 2) {
    return {
      days: [],
      issues: [{ line: 0, reason: 'The file needs a header row and at least one data row.' }],
      recordsScanned: 0,
    };
  }

  const header = splitRow(lines[0]!).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));

  // Map each column index to the metric it feeds.
  const columns = new Map<number, { metric: Metric | 'date'; scale: number }>();
  header.forEach((name, index) => {
    for (const alias of COLUMN_ALIASES) {
      if (alias.names.includes(name)) {
        columns.set(index, { metric: alias.metric, scale: alias.scale ?? 1 });
        return;
      }
    }
  });

  const dateColumn = [...columns.entries()].find(([, c]) => c.metric === 'date')?.[0];
  if (dateColumn === undefined) {
    return {
      days: [],
      issues: [
        {
          line: 1,
          reason: `No date column found. Expected one of: ${COLUMN_ALIASES[0]!.names.join(', ')}. Saw: ${header.join(', ')}`,
        },
      ],
      recordsScanned: 0,
    };
  }

  const metricColumns = [...columns.entries()].filter(([, c]) => c.metric !== 'date');
  if (metricColumns.length === 0) {
    return {
      days: [],
      issues: [{ line: 1, reason: `No recognised metric columns. Saw: ${header.join(', ')}` }],
      recordsScanned: 0,
    };
  }

  const acc = new DayAccumulator();
  let recordsScanned = 0;

  for (let i = 1; i < lines.length; i += 1) {
    recordsScanned += 1;
    const cells = splitRow(lines[i]!);

    const date = normaliseDate(cells[dateColumn] ?? '');
    if (!date) {
      if (issues.length < 50) {
        issues.push({ line: i + 1, reason: `Unreadable date: "${cells[dateColumn] ?? ''}"` });
      }
      continue;
    }

    for (const [index, column] of metricColumns) {
      const value = toNumber(cells[index] ?? '');
      if (value === null) continue;
      // Daily rows: a repeated date accumulates rather than overwrites, so
      // exporters that split a day across rows still total correctly.
      acc.add(date, column.metric as Metric, value * column.scale);
    }
  }

  const days: ImportDay[] = acc.toDays();
  if (days.length === 0 && issues.length === 0) {
    issues.push({ line: 0, reason: 'No usable rows found.' });
  }

  return { days, issues, recordsScanned };
}

export function detectFormat(file: File): 'apple-health' | 'csv' | 'unknown' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xml')) return 'apple-health';
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) return 'csv';
  return 'unknown';
}
