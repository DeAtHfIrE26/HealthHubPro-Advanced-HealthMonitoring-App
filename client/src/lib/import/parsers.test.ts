import { describe, expect, it } from 'vitest';
import { parseAppleHealth } from './appleHealth';
import { detectFormat, parseCsv } from './csv';

const file = (content: string, name: string): File =>
  new File([content], name, { type: 'text/plain' });

const wrapHealth = (records: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="en_GB">\n${records}\n</HealthData>`;

const record = (
  type: string,
  value: string,
  startDate: string,
  unit = 'count',
  endDate?: string,
): string =>
  `<Record type="${type}" sourceName="iPhone" unit="${unit}" startDate="${startDate}"${
    endDate ? ` endDate="${endDate}"` : ''
  } value="${value}"/>`;

describe('detectFormat', () => {
  it.each([
    ['export.xml', 'apple-health'],
    ['Daily activity metrics.csv', 'csv'],
    ['data.tsv', 'csv'],
    ['photo.png', 'unknown'],
    ['archive.zip', 'unknown'],
  ])('maps %s to %s', (name, expected) => {
    expect(detectFormat(file('x', name))).toBe(expected);
  });
});

describe('parseAppleHealth', () => {
  it('sums step records into a daily total', async () => {
    const xml = wrapHealth(
      [
        record('HKQuantityTypeIdentifierStepCount', '500', '2026-09-20 09:00:00 +0100'),
        record('HKQuantityTypeIdentifierStepCount', '300', '2026-09-20 14:00:00 +0100'),
        record('HKQuantityTypeIdentifierStepCount', '900', '2026-09-21 08:00:00 +0100'),
      ].join('\n'),
    );

    const { days, recordsScanned } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(recordsScanned).toBe(3);
    expect(days).toEqual([
      { date: '2026-09-20', steps: 800 },
      { date: '2026-09-21', steps: 900 },
    ]);
  });

  it('converts kilojoules to kilocalories', async () => {
    const xml = wrapHealth(
      record(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        '418.4',
        '2026-09-20 09:00:00 +0100',
        'kJ',
      ),
    );
    const { days } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days[0]?.calories).toBe(100);
  });

  it('leaves kilocalories alone', async () => {
    const xml = wrapHealth(
      record(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        '250',
        '2026-09-20 09:00:00 +0100',
        'Cal',
      ),
    );
    const { days } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days[0]?.calories).toBe(250);
  });

  it.each([
    ['mL', '500', 0.5],
    ['L', '1.5', 1.5],
  ])('converts water in %s', async (unit, value, expected) => {
    const xml = wrapHealth(
      record('HKQuantityTypeIdentifierDietaryWater', value, '2026-09-20 09:00:00 +0100', unit),
    );
    const { days } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days[0]?.waterLiters).toBeCloseTo(expected, 1);
  });

  it('derives sleep hours from the record duration', async () => {
    const xml = wrapHealth(
      `<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-09-20 23:00:00 +0000" endDate="2026-09-21 06:30:00 +0000" value="HKCategoryValueSleepAnalysisAsleepCore"/>`,
    );
    const { days } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days[0]?.sleepHours).toBeCloseTo(7.5, 1);
  });

  it('ignores InBed records, which overstate real sleep', async () => {
    const xml = wrapHealth(
      `<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-09-20 22:00:00 +0000" endDate="2026-09-21 08:00:00 +0000" value="HKCategoryValueSleepAnalysisInBed"/>`,
    );
    const { days } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days).toEqual([]);
  });

  it('skips record types it does not map', async () => {
    const xml = wrapHealth(
      [
        record('HKQuantityTypeIdentifierHeartRate', '62', '2026-09-20 09:00:00 +0100', 'count/min'),
        record('HKQuantityTypeIdentifierStepCount', '100', '2026-09-20 09:00:00 +0100'),
      ].join('\n'),
    );
    const { days, recordsScanned } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(recordsScanned).toBe(2);
    expect(days).toEqual([{ date: '2026-09-20', steps: 100 }]);
  });

  it('reports an unreadable value instead of dropping it silently', async () => {
    const xml = wrapHealth(
      record('HKQuantityTypeIdentifierStepCount', 'not-a-number', '2026-09-20 09:00:00 +0100'),
    );
    const { days, issues } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days).toEqual([]);
    expect(issues[0]?.reason).toContain('Unreadable value');
  });

  it('explains itself when handed the wrong XML', async () => {
    const { days, issues } = await parseAppleHealth(
      file('<?xml version="1.0"?><rss><channel/></rss>', 'feed.xml'),
    );
    expect(days).toEqual([]);
    expect(issues[0]?.reason).toContain('Apple Health');
  });

  it('handles an empty file without throwing', async () => {
    const { days } = await parseAppleHealth(file('', 'export.xml'));
    expect(days).toEqual([]);
  });

  it('caps a day at 24 hours of sleep', async () => {
    const xml = wrapHealth(
      Array.from({ length: 5 }, (_, i) =>
        `<Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-09-20 0${i}:00:00 +0000" endDate="2026-09-20 0${i}:00:00 +0000" value="Asleep"/>`.replace(
          `endDate="2026-09-20 0${i}:00:00 +0000"`,
          `endDate="2026-09-21 0${i}:00:00 +0000"`,
        ),
      ).join('\n'),
    );
    const { days } = await parseAppleHealth(file(xml, 'export.xml'));
    expect(days[0]!.sleepHours).toBeLessThanOrEqual(24);
  });

  it('reassembles records split across read chunks', async () => {
    // Padding pushes record boundaries across the 4MB slice size.
    const padding = `<!--${'x'.repeat(1024)}-->\n`;
    const body = Array.from(
      { length: 5000 },
      () =>
        `${padding}${record('HKQuantityTypeIdentifierStepCount', '10', '2026-09-20 09:00:00 +0100')}`,
    ).join('\n');

    const { days } = await parseAppleHealth(file(wrapHealth(body), 'export.xml'));
    // Every record must survive chunking: 5000 x 10 steps.
    expect(days[0]?.steps).toBe(50_000);
  });
});

describe('parseCsv', () => {
  it('reads a simple daily export', async () => {
    const csv = 'date,steps,calories\n2026-09-20,8000,420\n2026-09-21,9500,500';
    const { days } = await parseCsv(file(csv, 'data.csv'));
    expect(days).toEqual([
      { date: '2026-09-20', steps: 8000, calories: 420 },
      { date: '2026-09-21', steps: 9500, calories: 500 },
    ]);
  });

  it('matches column aliases case-insensitively', async () => {
    const csv = 'Date,Step Count,Move Minutes\n2026-09-20,1000,30';
    const { days } = await parseCsv(file(csv, 'fit.csv'));
    expect(days[0]).toEqual({ date: '2026-09-20', steps: 1000, activeMinutes: 30 });
  });

  it('converts sleep given in minutes', async () => {
    const csv = 'date,minutes asleep\n2026-09-20,450';
    const { days } = await parseCsv(file(csv, 'fitbit.csv'));
    expect(days[0]?.sleepHours).toBeCloseTo(7.5, 1);
  });

  it('converts water given in millilitres', async () => {
    const csv = 'date,water ml\n2026-09-20,2400';
    const { days } = await parseCsv(file(csv, 'water.csv'));
    expect(days[0]?.waterLiters).toBeCloseTo(2.4, 1);
  });

  it('strips thousands separators inside quoted fields', async () => {
    const csv = 'date,steps\n2026-09-20,"12,345"';
    const { days } = await parseCsv(file(csv, 'quoted.csv'));
    expect(days[0]?.steps).toBe(12_345);
  });

  it.each([
    ['2026-09-20', '2026-09-20'],
    ['20/09/2026', '2026-09-20'],
    ['09/20/2026', '2026-09-20'],
  ])('normalises the date %s', async (input, expected) => {
    const { days } = await parseCsv(file(`date,steps\n${input},100`, 'd.csv'));
    expect(days[0]?.date).toBe(expected);
  });

  it('sums repeated rows for the same day', async () => {
    const csv = 'date,steps\n2026-09-20,100\n2026-09-20,150';
    const { days } = await parseCsv(file(csv, 'split.csv'));
    expect(days).toEqual([{ date: '2026-09-20', steps: 250 }]);
  });

  it('names the columns it saw when there is no date column', async () => {
    const { days, issues } = await parseCsv(file('foo,bar\n1,2', 'wrong.csv'));
    expect(days).toEqual([]);
    expect(issues[0]?.reason).toContain('No date column');
    expect(issues[0]?.reason).toContain('foo');
  });

  it('reports when no metric column is recognised', async () => {
    const { days, issues } = await parseCsv(file('date,mood\n2026-09-20,good', 'mood.csv'));
    expect(days).toEqual([]);
    expect(issues[0]?.reason).toContain('No recognised metric');
  });

  it('skips an unreadable row but keeps the good ones', async () => {
    const csv = 'date,steps\nnot-a-date,100\n2026-09-20,200';
    const { days, issues } = await parseCsv(file(csv, 'mixed.csv'));
    expect(days).toEqual([{ date: '2026-09-20', steps: 200 }]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.line).toBe(2);
  });

  it('ignores blank cells rather than writing zero', async () => {
    const csv = 'date,steps,calories\n2026-09-20,,400';
    const { days } = await parseCsv(file(csv, 'sparse.csv'));
    expect(days[0]).toEqual({ date: '2026-09-20', calories: 400 });
  });

  it('rejects a file with only a header', async () => {
    const { days, issues } = await parseCsv(file('date,steps', 'empty.csv'));
    expect(days).toEqual([]);
    expect(issues[0]?.reason).toContain('header row and at least one data row');
  });

  it('tolerates CRLF line endings', async () => {
    const { days } = await parseCsv(file('date,steps\r\n2026-09-20,100\r\n', 'win.csv'));
    expect(days).toEqual([{ date: '2026-09-20', steps: 100 }]);
  });
});
