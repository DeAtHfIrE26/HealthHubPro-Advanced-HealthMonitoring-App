import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import type { ChallengeSummary } from '@shared/schema';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError, api } from '@/lib/api';
import { formatDaysLeft, formatNumber, initials } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const UNIT: Record<ChallengeSummary['type'], string> = {
  steps: 'steps',
  calories: 'kcal',
  activeMinutes: 'min',
  workouts: 'sessions',
};

function Leaderboard({ challengeId }: { challengeId: number }) {
  const { user } = useAuth();

  // Polling replaces the WebSocket the old code had: serverless functions
  // cannot hold a socket open, and at this cadence the difference is invisible.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', challengeId],
    queryFn: () => api.leaderboard(challengeId),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        Could not load the leaderboard.{' '}
        <button className="text-accent underline" onClick={() => void refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const rows = data?.leaderboard ?? [];
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-text-muted">Nobody has joined yet.</p>;
  }

  const samples = rows.filter((row) => row.isSample).length;

  return (
    <>
      <ol className="space-y-1 pt-2">
        {rows.map((row) => {
          const isYou = row.userId === user?.id;
          return (
            <li
              key={row.userId}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-1.5',
                isYou && 'bg-accent/10',
              )}
            >
              <span
                className={cn(
                  'numeric w-5 shrink-0 text-center text-xs',
                  row.rank === 1 ? 'text-accent' : 'text-text-subtle',
                )}
              >
                {row.rank === 1 ? (
                  <Crown className="mx-auto size-3.5" aria-label="Leader" />
                ) : (
                  row.rank
                )}
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-2xs font-semibold text-text-muted">
                {initials(row.name.split(' ')[0] ?? '', row.name.split(' ')[1] ?? '')}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
                <span className="truncate">{row.name}</span>
                {isYou ? <span className="text-xs text-accent">(you)</span> : null}
                {row.isSample ? (
                  <span
                    className="shrink-0 rounded-sm border border-border px-1 py-px text-2xs uppercase tracking-wide text-text-subtle"
                    title="A generated pace-setter, not a real person"
                  >
                    Sample
                  </span>
                ) : null}
              </span>
              <span className="numeric shrink-0 text-sm text-text-muted">
                {formatNumber(row.progress)}
              </span>
            </li>
          );
        })}
      </ol>
      {samples > 0 ? (
        <p className="px-2 pt-2 text-2xs text-text-subtle">
          {samples} of these are generated pace-setters that ship with the app, so a leaderboard has
          something on it before anyone else joins. They are not real people.
        </p>
      ) : null}
    </>
  );
}

export default function Challenges() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);

  const query = useQuery({ queryKey: ['challenges'], queryFn: () => api.challenges() });

  const toggle = useMutation({
    mutationFn: ({ id, joined }: { id: number; joined: boolean }) =>
      joined ? api.leaveChallenge(id) : api.joinChallenge(id),
    onSuccess: async (_data, { joined }) => {
      toast({ title: joined ? 'Left the challenge' : 'Joined the challenge', tone: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['challenges'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (error: unknown) =>
      toast({
        title: 'That did not work',
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'error',
      }),
  });

  const challenges = query.data?.challenges ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Challenges</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Progress is computed from your logged activity — leaderboards refresh every few seconds.
        </p>
      </div>

      {query.error ? (
        <ErrorState message="We could not load challenges." onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No challenges running"
          description="There are no active challenges right now. Check back soon."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {challenges.map((challenge) => {
            const ended =
              challenge.daysLeft === 0 && challenge.endDate < new Date().toISOString().slice(0, 10);
            const isOpen = openId === challenge.id;

            return (
              <li key={challenge.id}>
                <Card className="flex h-full flex-col">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={challenge.joined ? 'accent' : 'neutral'}>
                        {challenge.joined ? 'Joined' : 'Open'}
                      </Badge>
                      <Badge tone={ended ? 'danger' : challenge.daysLeft <= 2 ? 'warn' : 'neutral'}>
                        {formatDaysLeft(challenge.daysLeft, ended)}
                      </Badge>
                      <span className="ml-auto flex items-center gap-1 text-xs text-text-subtle">
                        <Users className="size-3.5" aria-hidden="true" />
                        <span className="numeric">{challenge.participantCount}</span>
                      </span>
                    </div>
                    <CardTitle className="mt-1">{challenge.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col">
                    <p className="text-sm text-text-muted">{challenge.description}</p>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="text-text-muted">
                          {challenge.joined ? 'Your progress' : 'Target'}
                        </span>
                        <span className="numeric text-text">
                          {challenge.joined ? `${formatNumber(challenge.progress)} / ` : ''}
                          {formatNumber(challenge.target)} {UNIT[challenge.type]}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-surface-raised"
                        role="progressbar"
                        aria-valuenow={challenge.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${challenge.name} progress`}
                      >
                        <div
                          className="h-full rounded-full bg-chart-1 transition-[width] duration-700 ease-out"
                          style={{ width: `${challenge.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant={challenge.joined ? 'outline' : 'primary'}
                        className="flex-1"
                        disabled={toggle.isPending || ended}
                        onClick={() =>
                          toggle.mutate({ id: challenge.id, joined: challenge.joined })
                        }
                      >
                        {ended ? 'Ended' : challenge.joined ? 'Leave' : 'Join challenge'}
                      </Button>
                      <Button
                        variant="ghost"
                        aria-expanded={isOpen}
                        onClick={() => setOpenId(isOpen ? null : challenge.id)}
                      >
                        {isOpen ? 'Hide' : 'Leaderboard'}
                      </Button>
                    </div>

                    {isOpen ? <Leaderboard challengeId={challenge.id} /> : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
