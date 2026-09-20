import { describe, expect, it } from 'vitest';
import {
  formatDaysLeft,
  formatDecimal,
  formatDuration,
  formatNumber,
  formatRelativeDay,
  formatShortDate,
  formatWeekday,
  initials,
  parseIsoDate,
} from './format';

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('rounds to the nearest integer', () => {
    expect(formatNumber(1234.6)).toBe('1,235');
  });

  it('handles zero and negatives', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-42)).toBe('-42');
  });
});

describe('formatDecimal', () => {
  it('keeps one decimal place by default', () => {
    expect(formatDecimal(2.45)).toBe('2.5');
    expect(formatDecimal(8)).toBe('8.0');
  });

  it('respects an explicit precision', () => {
    expect(formatDecimal(2.456, 2)).toBe('2.46');
    expect(formatDecimal(2.456, 0)).toBe('2');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [45, '45s'],
    [59, '59s'],
    [60, '1m'],
    [90, '1m'],
    [1800, '30m'],
    [3599, '59m'],
    [3600, '1h 00m'],
    [3900, '1h 05m'],
    [7200, '2h 00m'],
    [86_399, '23h 59m'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('parseIsoDate', () => {
  it('parses as a local date, not UTC', () => {
    // Parsing as UTC would shift this to the 19th in negative offsets.
    const d = parseIsoDate('2026-09-20');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(20);
  });
});

describe('formatWeekday / formatShortDate', () => {
  it('names the weekday', () => {
    expect(formatWeekday('2026-09-20')).toBe('Sun');
  });

  it('formats a short date', () => {
    expect(formatShortDate('2026-09-20')).toBe('Sep 20');
    expect(formatShortDate('2026-01-01')).toBe('Jan 1');
  });
});

describe('formatRelativeDay', () => {
  const today = '2026-09-20';

  it.each([
    ['2026-09-20', 'Today'],
    ['2026-09-19', 'Yesterday'],
    ['2026-09-17', '3 days ago'],
    ['2026-09-13', 'Sep 13'],
  ])('formats %s as %s', (date, expected) => {
    expect(formatRelativeDay(date, today)).toBe(expected);
  });

  it('falls back to a date for future days', () => {
    expect(formatRelativeDay('2026-09-25', today)).toBe('Sep 25');
  });
});

describe('formatDaysLeft', () => {
  it.each([
    [5, false, '5 days left'],
    [1, false, '1 day left'],
    [0, false, 'Ends today'],
    [0, true, 'Ended'],
    [3, true, 'Ended'],
  ])('formats (%i, ended=%s) as %s', (days, ended, expected) => {
    expect(formatDaysLeft(days, ended)).toBe(expected);
  });
});

describe('initials', () => {
  it('takes the first letter of each name, uppercased', () => {
    expect(initials('kashyap', 'patel')).toBe('KP');
  });

  it('survives empty strings', () => {
    expect(initials('', '')).toBe('');
    expect(initials('Ada', '')).toBe('A');
  });

  it('handles unicode names', () => {
    expect(initials('Zoë', '田中')).toBe('Z田');
  });
});
