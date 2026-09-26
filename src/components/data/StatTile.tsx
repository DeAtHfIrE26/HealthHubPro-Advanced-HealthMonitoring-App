import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { useCountUp } from '../../hooks/useCountUp';
import { cn } from '../../lib/utils';

export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  unit,
  delta,
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  /** Raw figure; the tile animates towards it and formats as it goes. */
  value: number;
  format: (value: number) => string;
  unit?: string;
  /** Percent change vs the previous equivalent period. Omit when unknown. */
  delta?: number | null;
  index?: number;
}) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta) && Math.abs(delta) >= 1;
  const up = (delta ?? 0) > 0;
  const shown = useCountUp(value);

  return (
    <Card
      className="stat-enter p-4 transition-colors duration-150 hover:border-border-strong"
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <Icon className="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
      </div>

      <p className="mt-2 flex items-baseline gap-1">
        {/*
          aria-live is deliberately absent: the figure ticks every frame while
          it settles, and announcing each step would be unusable.
        */}
        <span className="numeric text-2xl font-semibold text-text">{format(shown)}</span>
        {unit ? <span className="text-xs text-text-muted">{unit}</span> : null}
      </p>

      {hasDelta ? (
        <p
          className={cn(
            'mt-1 flex items-center gap-1 text-xs',
            up ? 'text-accent' : 'text-text-muted',
          )}
        >
          {up ? (
            <TrendingUp className="size-3" aria-hidden="true" />
          ) : (
            <TrendingDown className="size-3" aria-hidden="true" />
          )}
          <span className="numeric">{Math.abs(Math.round(delta))}%</span>
          <span className="text-text-subtle">vs last week</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-text-subtle">No change vs last week</p>
      )}
    </Card>
  );
}
