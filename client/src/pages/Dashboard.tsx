import { useQuery } from '@tanstack/react-query';
import { Droplets, Flame, Footprints, Moon, Plus, Timer } from 'lucide-react';
import { useState } from 'react';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { GoalRing } from '@/components/dashboard/GoalRing';
import { LogActivityDialog } from '@/components/dashboard/LogActivityDialog';
import { StatTile } from '@/components/dashboard/StatTile';
import { ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  formatDecimal,
  formatDuration,
  formatNumber,
  formatRelativeDay,
  todayIso,
} from '@/lib/format';

/**
 * Days of history the week-on-week deltas need: two full weeks, so the last
 * seven can be compared with the seven before them. The fetch below widens to
 * at least this, which is why weekDelta can assume it has enough.
 */
const DELTA_DAYS = 14;

/** Percent change between the last `n` days and the `n` before that. */
function weekDelta(values: number[]): number | null {
  if (values.length < DELTA_DAYS) return null;
  const recent = values.slice(-7).reduce((a, b) => a + b, 0);
  const previous = values.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (previous === 0) return null;
  return ((recent - previous) / previous) * 100;
}

/**
 * Sized to the page it stands in for.
 *
 * It used to reserve ~650px against ~1240px of real content, so everything
 * below it -- including the footer -- dropped half a screen the moment the
 * data landed. Measured at both breakpoints: greeting 54, tiles 110/354,
 * goals 190/334, chart 410/486, sessions 382.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[54px] max-w-xs" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-[334px] lg:h-[190px]" />
      <Skeleton className="h-[486px] lg:h-[410px]" />
      <Skeleton className="h-[382px]" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [logOpen, setLogOpen] = useState(false);
  const today = todayIso();

  /*
   * One history request serves all three things this page needs.
   *
   * It used to make three: the chart range, a fixed 14 days for the
   * week-on-week deltas, and today's totals. But 14 days contains 7, any
   * range >= 14 contains 14, and today is simply the last row of whichever
   * window came back -- so two of the three were re-asking for data already
   * in flight. Fetching max(days, DELTA_DAYS) once and slicing locally drops
   * two round trips from every dashboard load without changing a single
   * number on screen.
   */
  const windowDays = Math.max(days, DELTA_DAYS);
  const goalsQuery = useQuery({ queryKey: ['goals'], queryFn: () => api.goals() });
  const historyQuery = useQuery({
    queryKey: ['history', windowDays],
    queryFn: () => api.history(windowDays),
  });
  const sessionsQuery = useQuery({ queryKey: ['sessions', 5], queryFn: () => api.sessions(5) });

  const isLoading = goalsQuery.isLoading || historyQuery.isLoading;
  const error = goalsQuery.error ?? historyQuery.error;

  if (error) {
    return (
      <ErrorState
        message="We could not load your dashboard. Your connection may have dropped."
        onRetry={() => {
          void goalsQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  const goals = goalsQuery.data?.goals ?? [];
  // Not named `window`: shadowing the global in a component is asking for a
  // confusing bug the first time something here needs the real one.
  const series = historyQuery.data?.history ?? [];
  // The server zero-fills every day in the range and ends on today, so the
  // last row is today's totals and the tail is the chart's range.
  const history = series.slice(-days);
  const trend = series.slice(-DELTA_DAYS);
  const activity = series.at(-1);
  const sessions = sessionsQuery.data?.sessions ?? [];

  const tiles = [
    {
      icon: Footprints,
      label: 'Steps',
      value: activity?.steps ?? 0,
      format: formatNumber,
      delta: weekDelta(trend.map((d) => d.steps)),
    },
    {
      icon: Flame,
      label: 'Calories',
      value: activity?.calories ?? 0,
      format: formatNumber,
      unit: 'kcal',
      delta: weekDelta(trend.map((d) => d.calories)),
    },
    {
      icon: Timer,
      label: 'Active',
      value: activity?.activeMinutes ?? 0,
      format: formatNumber,
      unit: 'min',
      delta: weekDelta(trend.map((d) => d.activeMinutes)),
    },
    {
      icon: Moon,
      label: 'Sleep',
      value: activity?.sleepHours ?? 0,
      format: formatDecimal,
      unit: 'h',
      delta: weekDelta(trend.map((d) => d.sleepHours)),
    },
    {
      icon: Droplets,
      label: 'Water',
      value: activity?.waterLiters ?? 0,
      format: formatDecimal,
      unit: 'L',
      delta: weekDelta(trend.map((d) => d.waterLiters)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {user ? `Hello, ${user.firstName}` : 'Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">Here is how today is going.</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus aria-hidden="true" />
          Log activity
        </Button>
      </div>

      <section aria-label="Today's totals">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile, i) => (
            <li key={tile.label}>
              <StatTile {...tile} index={i} />
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s goals</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {goals.map((goal) => (
              <GoalRing key={goal.id} goal={goal} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity history</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart history={history} goals={goals} days={days} onDaysChange={setDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              No workouts logged yet. Start one from the Workouts page.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.workout.name}</p>
                    <p className="text-xs text-text-subtle">
                      {formatRelativeDay(
                        (session.completedAt ?? session.startedAt).toString().slice(0, 10),
                        today,
                      )}
                      {' · '}
                      {session.workout.type}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="numeric text-sm">{formatDuration(session.elapsedSec)}</p>
                    <p className="numeric text-xs text-text-subtle">
                      {formatNumber(session.caloriesBurned)} kcal
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LogActivityDialog open={logOpen} onOpenChange={setLogOpen} activity={activity} />
    </div>
  );
}
