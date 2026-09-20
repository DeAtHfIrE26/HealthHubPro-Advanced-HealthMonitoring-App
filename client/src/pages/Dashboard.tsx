import { useQuery } from '@tanstack/react-query';
import { Droplets, Flame, Footprints, Moon, Plus, Timer } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
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

/*
 * Recharts is ~100 kB gzipped — a third of the whole bundle — and the tiles
 * above it are the first thing worth reading. Splitting it lets the dashboard
 * paint without waiting for the chart.
 */
const ActivityChart = lazy(() =>
  import('@/components/dashboard/ActivityChart').then((m) => ({ default: m.ActivityChart })),
);

/** Percent change between the last `n` days and the `n` before that. */
function weekDelta(values: number[]): number | null {
  if (values.length < 14) return null;
  const recent = values.slice(-7).reduce((a, b) => a + b, 0);
  const previous = values.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (previous === 0) return null;
  return ((recent - previous) / previous) * 100;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-[136px]" />
      <Skeleton className="h-[360px]" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [logOpen, setLogOpen] = useState(false);
  const today = todayIso();

  const goalsQuery = useQuery({ queryKey: ['goals'], queryFn: () => api.goals() });
  const activityQuery = useQuery({ queryKey: ['activity', today], queryFn: () => api.activity() });
  const historyQuery = useQuery({
    queryKey: ['history', days],
    queryFn: () => api.history(days),
  });
  // Always fetch 14 days for the week-on-week deltas, regardless of chart range.
  const trendQuery = useQuery({ queryKey: ['history', 14], queryFn: () => api.history(14) });
  const sessionsQuery = useQuery({ queryKey: ['sessions', 5], queryFn: () => api.sessions(5) });

  const isLoading = goalsQuery.isLoading || activityQuery.isLoading || historyQuery.isLoading;
  const error = goalsQuery.error ?? activityQuery.error ?? historyQuery.error;

  if (error) {
    return (
      <ErrorState
        message="We could not load your dashboard. Your connection may have dropped."
        onRetry={() => {
          void goalsQuery.refetch();
          void activityQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  const goals = goalsQuery.data?.goals ?? [];
  const activity = activityQuery.data?.activity;
  const history = historyQuery.data?.history ?? [];
  const trend = trendQuery.data?.history ?? [];
  const sessions = sessionsQuery.data?.sessions ?? [];

  const tiles = [
    {
      icon: Footprints,
      label: 'Steps',
      value: formatNumber(activity?.steps ?? 0),
      delta: weekDelta(trend.map((d) => d.steps)),
    },
    {
      icon: Flame,
      label: 'Calories',
      value: formatNumber(activity?.calories ?? 0),
      unit: 'kcal',
      delta: weekDelta(trend.map((d) => d.calories)),
    },
    {
      icon: Timer,
      label: 'Active',
      value: formatNumber(activity?.activeMinutes ?? 0),
      unit: 'min',
      delta: weekDelta(trend.map((d) => d.activeMinutes)),
    },
    {
      icon: Moon,
      label: 'Sleep',
      value: formatDecimal(activity?.sleepHours ?? 0),
      unit: 'h',
      delta: weekDelta(trend.map((d) => d.sleepHours)),
    },
    {
      icon: Droplets,
      label: 'Water',
      value: formatDecimal(activity?.waterLiters ?? 0),
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
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
          <Suspense fallback={<Skeleton className="h-[304px]" />}>
            <ActivityChart history={history} goals={goals} days={days} onDaysChange={setDays} />
          </Suspense>
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
