import { useEffect, useMemo, useState } from 'react';
import type { ActivityStat, GoalProgress } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { formatDecimal, formatNumber, formatShortDate, formatWeekday } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
 * Hand-rolled rather than charted by a library.
 *
 * This was Recharts, which cost 371 kB raw / 99 kB gzipped -- the single
 * largest asset in the app, larger than React -- and profiling put ~270ms of
 * script self-time in its chunk, the last main-thread task over 100ms on the
 * dashboard. For a bar chart of at most 30 bars with two axes, a dashed goal
 * line and a hover tooltip, that is a library's worth of generality nobody
 * here uses.
 *
 * Bars are laid out with flex and scaled with `transform: scaleY()` from the
 * bottom, so the plot is responsive with no DOM measurement and no
 * ResizeObserver, and the scaling is GPU-composited rather than a layout pass.
 * Gridlines and the goal line are absolutely positioned at percentage offsets,
 * which is the same idea.
 */

type MetricKey = 'steps' | 'calories' | 'activeMinutes' | 'sleepHours' | 'waterLiters';

const METRICS: Array<{
  key: MetricKey;
  label: string;
  goalType: GoalProgress['type'];
  unit: string;
  decimal?: boolean;
}> = [
  { key: 'steps', label: 'Steps', goalType: 'steps', unit: '' },
  { key: 'calories', label: 'Calories', goalType: 'calories', unit: 'kcal' },
  { key: 'activeMinutes', label: 'Active', goalType: 'activeMinutes', unit: 'min' },
  { key: 'sleepHours', label: 'Sleep', goalType: 'sleep', unit: 'h', decimal: true },
  { key: 'waterLiters', label: 'Water', goalType: 'water', unit: 'L', decimal: true },
];

const RANGES = [7, 14, 30];
const TICK_COUNT = 4;

type Row = { date: string; label: string; value: number };

/**
 * Rounds a domain maximum up to a readable step, the way an axis library
 * would, so tick labels land on 2k rather than 1.847k.
 */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

export function ActivityChart({
  history,
  goals,
  days,
  onDaysChange,
}: {
  history: ActivityStat[];
  goals: GoalProgress[];
  days: number;
  onDaysChange: (days: number) => void;
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>('steps');
  const [hovered, setHovered] = useState<number | null>(null);

  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0]!;
  const goalTarget = goals.find((g) => g.type === metric.goalType)?.target;

  const rows = useMemo<Row[]>(
    () =>
      history.map((entry) => ({
        date: entry.date,
        label: days <= 7 ? formatWeekday(entry.date) : formatShortDate(entry.date),
        value: entry[metric.key],
      })),
    [history, metric.key, days],
  );

  const peak = useMemo(() => Math.max(...rows.map((r) => r.value), 0), [rows]);
  const allZero = peak === 0;

  /*
   * A hovered index points into `rows`, so it stops meaning anything the
   * moment the metric or range changes. Left alone it kept the tooltip open
   * over a different day's value after switching 7d -> 30d.
   */
  useEffect(() => setHovered(null), [metricKey, days]);

  const format = (v: number) => (metric.decimal ? formatDecimal(v) : formatNumber(v));

  // The goal is included in the domain so its line is never off the top.
  const domainMax = useMemo(() => niceMax(Math.max(peak, goalTarget ?? 0)), [peak, goalTarget]);

  const ticks = useMemo(
    () => Array.from({ length: TICK_COUNT + 1 }, (_, i) => (domainMax / TICK_COUNT) * i).reverse(),
    [domainMax],
  );

  const tickLabel = (v: number) =>
    metric.decimal ? formatDecimal(v, 0) : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);

  /* Show every label at 7 days, then thin out so they never collide. */
  const labelEvery = days <= 7 ? 1 : days <= 14 ? 2 : 5;

  return (
    <div>
      {/* Filters sit in one row above the plot. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Metric">
          {METRICS.map((m) => (
            <Button
              key={m.key}
              size="sm"
              variant={m.key === metricKey ? 'secondary' : 'ghost'}
              aria-pressed={m.key === metricKey}
              onClick={() => setMetricKey(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1" role="group" aria-label="Date range">
          {RANGES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={d === days ? 'secondary' : 'ghost'}
              aria-pressed={d === days}
              onClick={() => onDaysChange(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {allZero ? (
        <p className="flex h-64 items-center justify-center text-sm text-text-muted">
          No {metric.label.toLowerCase()} recorded in this range yet.
        </p>
      ) : (
        <div
          className="relative flex h-64 w-full"
          role="img"
          aria-label={`${metric.label} over the last ${days} days. Highest ${format(peak)}${
            metric.unit ? ` ${metric.unit}` : ''
          }. The same figures are in the table below.`}
          onPointerLeave={() => setHovered(null)}
          onPointerCancel={() => setHovered(null)}
        >
          {/* Y axis: labels only, no rule — the gridlines carry the scale. */}
          <div
            aria-hidden="true"
            className="flex w-11 shrink-0 flex-col justify-between pb-5 text-right text-[11px] leading-none text-text-subtle"
          >
            {ticks.map((t) => (
              <span key={t} className="numeric pr-2">
                {tickLabel(t)}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Plot area. The bottom 20px is the X-axis label strip. */}
            <div className="absolute inset-x-0 bottom-5 top-0">
              {ticks.map((t) => (
                <div
                  key={t}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-chart-grid"
                  style={{ bottom: `${(t / domainMax) * 100}%` }}
                />
              ))}

              {goalTarget && goalTarget <= domainMax ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 flex items-center"
                  style={{ bottom: `${(goalTarget / domainMax) * 100}%` }}
                >
                  <span className="h-0 flex-1 border-t border-dashed border-text-subtle" />
                  <span className="ml-1 shrink-0 text-[11px] leading-none text-text-subtle">
                    Goal
                  </span>
                </div>
              ) : null}

              {/*
                Each day gets an equal band; the bar is inset within its own
                band so the spacing is a constant fraction of it. A flex `gap`
                cannot do this -- a percentage gap resolves against the
                container, so at 30 days 29 gaps of 11% overflowed and flex
                shrank every bar to nothing. scaleY keeps the resize on the
                compositor.
              */}
              <div className="absolute inset-0 flex items-end">
                {rows.map((row, i) => (
                  <div
                    key={row.date}
                    className="relative h-full flex-1 cursor-default"
                    onPointerEnter={() => setHovered(i)}
                  >
                    {hovered === i ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-sm bg-surface-raised"
                      />
                    ) : null}
                    <span
                      className="absolute inset-x-[11%] bottom-0 top-0 origin-bottom rounded-t-[3px] bg-chart-1 transition-transform duration-300 ease-out motion-reduce:transition-none"
                      style={{
                        transform: `scaleY(${Math.max(0, row.value) / domainMax})`,
                        /* The peak day is the only mark that earns emphasis. */
                        opacity: row.value === peak ? 1 : 0.62,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/*
              X axis labels, thinned so they never collide, and centred on
              their band rather than confined to it. Confining them meant a
              30-day range gave each label a ~9px slot and "Sep 12" truncated
              to "S".
            */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-5">
              {rows.map((row, i) =>
                i % labelEvery === 0 || i === rows.length - 1 ? (
                  <span
                    key={row.date}
                    className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] leading-5 text-text-subtle"
                    style={{ left: `${((i + 0.5) / rows.length) * 100}%` }}
                  >
                    {row.label}
                  </span>
                ) : null,
              )}
            </div>

            {/* Tooltip, anchored over the hovered bar. */}
            {hovered !== null && rows[hovered] ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2 shadow-xl"
                style={{ left: `${((hovered + 0.5) / rows.length) * 100}%` }}
              >
                <p className="text-2xs uppercase text-text-subtle">
                  {formatShortDate(rows[hovered].date)}
                </p>
                <p className="numeric mt-0.5 whitespace-nowrap text-sm font-semibold text-text">
                  {format(rows[hovered].value)}
                  {metric.unit ? (
                    <span className="ml-1 text-xs text-text-muted">{metric.unit}</span>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Same numbers as a table: identity is never carried by colour alone. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-text-subtle hover:text-text-muted">
          View as table
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              {metric.label} for the last {days} days
            </caption>
            <thead className="sticky top-0 bg-surface-raised">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium text-text-muted">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-text-muted">
                  {metric.label}
                  {metric.unit ? ` (${metric.unit})` : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-t border-border">
                  <td className="px-3 py-1.5 text-text-muted">{formatShortDate(row.date)}</td>
                  <td
                    className={cn(
                      'numeric px-3 py-1.5 text-right',
                      row.value === peak && 'text-accent',
                    )}
                  >
                    {format(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
