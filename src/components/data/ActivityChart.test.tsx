/**
 * The chart that replaced 99 kB gzipped of charting library with 2 kB.
 *
 * The zero-width case below is the reason this file exists. A percentage flex
 * `gap` resolves against the container rather than the band, so at 30 days
 * twenty-nine gaps of 11% overflowed and every bar collapsed to nothing. The
 * plot still drew gridlines, axes and the goal line, so an entire suite
 * passed over an empty chart. jsdom reports no layout, so the guard here is
 * structural — one bar element per day, each with a scaleY transform — which
 * is what actually broke.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityStat, GoalProgress } from '../../types';
import { ActivityChart } from './ActivityChart';

function makeHistory(days: number, startSteps = 8000): ActivityStat[] {
  return Array.from({ length: days }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    steps: startSteps + i * 100,
    calories: 400 + i,
    activeMinutes: 30 + i,
    sleepHours: 7,
    waterLiters: 2,
  }));
}

const goals: GoalProgress[] = [
  { id: 1, type: 'steps', target: 10_000, current: 8000, percent: 80 },
];

const renderChart = (days: number, history = makeHistory(days)) =>
  render(<ActivityChart history={history} goals={goals} days={days} onDaysChange={vi.fn()} />);

/** The bars carry the scale transform; the gridlines and goal line do not. */
const bars = (container: HTMLElement) => container.querySelectorAll('span.origin-bottom');

describe('ActivityChart', () => {
  it.each([7, 14, 30])('renders one bar per day at %i days', (days) => {
    const { container } = renderChart(days);
    expect(bars(container)).toHaveLength(days);
  });

  it.each([7, 14, 30])('gives every bar a real scale at %i days', (days) => {
    const { container } = renderChart(days);
    for (const bar of bars(container)) {
      const scale = (bar as HTMLElement).style.transform;
      expect(scale).toMatch(/^scaleY\(/);
      const value = Number(scale.replace(/[^0-9.]/g, ''));
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('describes itself for assistive technology', () => {
    renderChart(7);
    expect(screen.getByRole('img', { name: /steps over the last 7 days/i })).toBeInTheDocument();
  });

  it('offers the same figures as a table, so nothing rides on colour', () => {
    renderChart(7);
    const table = screen.getByRole('table');
    // Header row plus one row per day.
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(within(table).getByText('8,600')).toBeInTheDocument();
  });

  it('shows an empty state rather than a flat axis when everything is zero', () => {
    const flat = makeHistory(7).map((d) => ({ ...d, steps: 0 }));
    const { container } = renderChart(7, flat);
    expect(screen.getByText(/no steps recorded in this range yet/i)).toBeInTheDocument();
    expect(bars(container)).toHaveLength(0);
  });

  it('scales bars against the goal when the goal is above the peak', () => {
    // A 10k goal against a 1k peak must not paint the peak full height.
    const low = makeHistory(7, 900).map((d) => ({ ...d, steps: 1000 }));
    const { container } = renderChart(7, low);
    const first = bars(container)[0] as HTMLElement;
    expect(Number(first.style.transform.replace(/[^0-9.]/g, ''))).toBeLessThan(0.5);
  });

  it('exposes every metric and range as a pressable control', () => {
    renderChart(7);
    for (const label of ['Steps', 'Calories', 'Active', 'Sleep', 'Water']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed');
    }
    for (const range of ['7d', '14d', '30d']) {
      expect(screen.getByRole('button', { name: range })).toBeInTheDocument();
    }
  });

  it('marks the active range as pressed', () => {
    renderChart(14);
    expect(screen.getByRole('button', { name: '14d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'false');
  });
});
