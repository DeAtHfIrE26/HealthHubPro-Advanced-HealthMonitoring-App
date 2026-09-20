import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActivityStat, GoalProgress } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { formatDecimal, formatNumber, formatShortDate, formatWeekday } from '@/lib/format';
import { cn } from '@/lib/utils';

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

type Row = { date: string; label: string; value: number };

function ChartTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
  metric: (typeof METRICS)[number];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-xl">
      <p className="text-2xs uppercase text-text-subtle">{formatShortDate(row.date)}</p>
      <p className="numeric mt-0.5 text-sm font-semibold text-text">
        {metric.decimal ? formatDecimal(row.value) : formatNumber(row.value)}
        {metric.unit ? <span className="ml-1 text-xs text-text-muted">{metric.unit}</span> : null}
      </p>
    </div>
  );
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
          {[7, 14, 30].map((d) => (
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
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 8, right: 4, bottom: 0, left: -16 }}
              barCategoryGap="22%"
            >
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--text-subtle))', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fill: 'hsl(var(--text-subtle))', fontSize: 11 }}
                tickFormatter={(v: number) =>
                  metric.decimal
                    ? formatDecimal(v, 0)
                    : v >= 1000
                      ? `${Math.round(v / 1000)}k`
                      : String(v)
                }
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--surface-raised))' }}
                content={<ChartTooltip metric={metric} />}
              />
              {goalTarget ? (
                <ReferenceLine
                  y={goalTarget}
                  stroke="hsl(var(--text-subtle))"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Goal',
                    position: 'right',
                    fill: 'hsl(var(--text-subtle))',
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {rows.map((row) => (
                  <Cell
                    key={row.date}
                    fill="hsl(var(--chart-1))"
                    /* The peak day is the only mark that earns emphasis. */
                    fillOpacity={row.value === peak ? 1 : 0.62}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
                    {metric.decimal ? formatDecimal(row.value) : formatNumber(row.value)}
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
