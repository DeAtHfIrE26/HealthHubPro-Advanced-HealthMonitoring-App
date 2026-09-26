import type { ImportDay, ParseIssue, ParseOutcome } from '../../types';
import { DayAccumulator, streamText, type Metric } from './aggregate';

/**
 * Apple Health `export.xml` parser.
 *
 * Deliberately a chunked regex scan rather than DOMParser: these files are
 * routinely 200MB+ and a DOM would exhaust the tab's memory. `<Record>`
 * elements are flat and self-closing, so scanning is both safe and fast.
 */
const RECORD_RE = /<Record\b([^>]*?)\/?>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

/** HealthKit identifier → our metric, with a unit-aware conversion. */
const QUANTITY_TYPES: Record<
  string,
  { metric: Metric; convert: (v: number, unit: string) => number }
> = {
  HKQuantityTypeIdentifierStepCount: { metric: 'steps', convert: (v) => v },
  HKQuantityTypeIdentifierActiveEnergyBurned: {
    metric: 'calories',
    // Apple exports kcal as "Cal"; kJ needs converting.
    convert: (v, unit) => (unit.toLowerCase().includes('kj') ? v / 4.184 : v),
  },
  HKQuantityTypeIdentifierAppleExerciseTime: { metric: 'activeMinutes', convert: (v) => v },
  HKQuantityTypeIdentifierDietaryWater: {
    metric: 'waterLiters',
    convert: (v, unit) => {
      const u = unit.toLowerCase();
      if (u.includes('ml')) return v / 1000;
      if (u.includes('floz') || u.includes('fl_oz')) return v * 0.0295735;
      return v; // already litres
    },
  },
};

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis';

/** Apple writes "2026-09-20 07:15:00 +0100" — take the calendar day as-is. */
function localDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function hoursBetween(start: string, end: string): number {
  const a = Date.parse(start.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'));
  const b = Date.parse(end.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'));
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return (b - a) / 3_600_000;
}

export async function parseAppleHealth(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ParseOutcome> {
  const acc = new DayAccumulator();
  const issues: ParseIssue[] = [];
  let recordsScanned = 0;

  const handleChunk = (text: string, isLast: boolean): string => {
    // Keep any trailing partial element for the next chunk.
    const safeEnd = isLast ? text.length : text.lastIndexOf('>') + 1;
    if (safeEnd <= 0) return text;

    const slice = text.slice(0, safeEnd);
    RECORD_RE.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = RECORD_RE.exec(slice)) !== null) {
      recordsScanned += 1;

      const attrs: Record<string, string> = {};
      ATTR_RE.lastIndex = 0;
      let attr: RegExpExecArray | null;
      while ((attr = ATTR_RE.exec(match[1] ?? '')) !== null) attrs[attr[1]!] = attr[2]!;

      const type = attrs.type;
      const startDate = attrs.startDate;
      if (!type || !startDate) continue;

      const date = localDate(startDate);
      if (!date) continue;

      if (type === SLEEP_TYPE) {
        // Only genuine sleep stages count; "InBed" overstates it.
        if (!attrs.value?.includes('Asleep') || !attrs.endDate) continue;
        acc.add(date, 'sleepHours', hoursBetween(startDate, attrs.endDate));
        continue;
      }

      const mapping = QUANTITY_TYPES[type];
      if (!mapping) continue;

      const raw = Number(attrs.value);
      if (!Number.isFinite(raw)) {
        if (issues.length < 50) {
          issues.push({ line: recordsScanned, reason: `Unreadable value for ${type}` });
        }
        continue;
      }

      acc.add(date, mapping.metric, mapping.convert(raw, attrs.unit ?? ''));
    }

    return text.slice(safeEnd);
  };

  await streamText(file, handleChunk, onProgress);

  const days: ImportDay[] = acc.toDays();
  if (days.length === 0 && recordsScanned === 0) {
    issues.push({
      line: 0,
      reason: 'No <Record> elements found. Is this the export.xml from Apple Health?',
    });
  }

  return { days, issues, recordsScanned };
}
