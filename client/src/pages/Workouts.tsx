import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Play, Search, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Workout } from '@shared/schema';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError, api } from '@/lib/api';
import { formatDuration, formatNumber } from '@/lib/format';

const TYPES = ['cardio', 'strength', 'flexibility', 'hiit', 'yoga'] as const;
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const ANY = 'any';

/** Live elapsed seconds for an in-progress session. */
function useElapsed(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}

export default function Workouts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [type, setType] = useState<string>(ANY);
  const [difficulty, setDifficulty] = useState<string>(ANY);

  const [active, setActive] = useState<{ id: number; workout: Workout; startedAt: number } | null>(
    null,
  );
  const elapsed = useElapsed(active?.startedAt ?? null);
  const liveRegion = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const query = useQuery({
    queryKey: ['workouts', type, difficulty, debounced],
    queryFn: () =>
      api.workouts({
        ...(type !== ANY ? { type } : {}),
        ...(difficulty !== ANY ? { difficulty } : {}),
        ...(debounced ? { q: debounced } : {}),
      }),
  });

  const startMutation = useMutation({
    mutationFn: (workout: Workout) => api.startSession(workout.id),
    onSuccess: ({ session }, workout) => {
      setActive({ id: session.id, workout, startedAt: Date.now() });
      toast({ title: `${workout.name} started`, tone: 'success' });
    },
    onError: (error: unknown) =>
      toast({
        title: 'Could not start the session',
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'error',
      }),
  });

  const finishMutation = useMutation({
    mutationFn: ({ id, seconds }: { id: number; seconds: number }) =>
      api.finishSession(id, seconds),
    onSuccess: async ({ session }) => {
      setActive(null);
      toast({
        title: 'Session complete',
        description: `${formatDuration(session.elapsedSec)} · ${formatNumber(session.caloriesBurned)} kcal`,
        tone: 'success',
      });
      await queryClient.invalidateQueries();
    },
    onError: (error: unknown) =>
      toast({
        title: 'Could not finish the session',
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'error',
      }),
  });

  const workouts = query.data?.workouts ?? [];
  const filtersActive = type !== ANY || difficulty !== ANY || debounced !== '';

  const clearFilters = () => {
    setType(ANY);
    setDifficulty(ANY);
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Workouts</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Pick a session, start the timer, and it lands on your dashboard when you finish.
        </p>
      </div>

      {active ? (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-2xs uppercase text-accent">In progress</p>
              <p className="truncate font-display text-lg font-semibold">{active.workout.name}</p>
              <p ref={liveRegion} aria-live="polite" className="numeric text-sm text-text-muted">
                {formatDuration(elapsed)} elapsed
              </p>
            </div>
            <Button
              onClick={() =>
                finishMutation.mutate({ id: active.id, seconds: Math.max(1, elapsed) })
              }
              disabled={finishMutation.isPending}
            >
              <Square aria-hidden="true" />
              {finishMutation.isPending ? 'Saving…' : 'Finish session'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters in one row above the results. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="workout-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
              aria-hidden="true"
            />
            <Input
              id="workout-search"
              className="pl-9"
              placeholder="Name or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex w-36 flex-col gap-1.5">
          <Label htmlFor="workout-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="workout-type" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-40 flex-col gap-1.5">
          <Label htmlFor="workout-level">Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger id="workout-level" aria-label="Filter by difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l} className="capitalize">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtersActive ? (
          <Button variant="ghost" onClick={clearFilters}>
            <X aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {query.isLoading ? 'Loading workouts' : `${workouts.length} workouts found`}
      </p>

      {query.error ? (
        <ErrorState
          message="We could not load the workout catalogue."
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workouts match those filters"
          description="Try a different type or difficulty, or clear the filters to see everything."
          action={
            filtersActive ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Card className="flex h-full flex-col transition-colors duration-150 hover:border-border-strong">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">{workout.type}</Badge>
                    <Badge>{workout.difficulty}</Badge>
                  </div>
                  <CardTitle className="mt-1">{workout.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="text-sm text-text-muted">{workout.description}</p>

                  <dl className="numeric mt-4 flex gap-4 text-sm">
                    <div>
                      <dt className="text-2xs uppercase text-text-subtle">Duration</dt>
                      <dd>{workout.durationMin} min</dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase text-text-subtle">Burn</dt>
                      <dd>{formatNumber(workout.caloriesBurn)} kcal</dd>
                    </div>
                    <div>
                      <dt className="text-2xs uppercase text-text-subtle">Moves</dt>
                      <dd>{workout.exercises.length}</dd>
                    </div>
                  </dl>

                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-xs text-text-subtle hover:text-text-muted">
                      Exercises
                    </summary>
                    <ul className="mt-2 space-y-1 text-text-muted">
                      {workout.exercises.map((ex) => (
                        <li key={ex.name} className="flex justify-between gap-2">
                          <span className="truncate">{ex.name}</span>
                          <span className="numeric shrink-0 text-xs text-text-subtle">
                            {ex.sets} × {ex.reps}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>

                  <Button
                    className="mt-auto w-full"
                    variant={active ? 'secondary' : 'primary'}
                    disabled={active !== null || startMutation.isPending}
                    onClick={() => startMutation.mutate(workout)}
                  >
                    <Play aria-hidden="true" />
                    {active ? 'Finish current session first' : 'Start workout'}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
