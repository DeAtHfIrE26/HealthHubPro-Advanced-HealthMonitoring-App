import type { GoalProgress } from '@shared/schema';
import { formatDecimal, formatNumber } from '@/lib/format';

const LABELS: Record<GoalProgress['type'], { title: string; unit: string; decimal: boolean }> = {
  steps: { title: 'Steps', unit: '', decimal: false },
  calories: { title: 'Calories', unit: 'kcal', decimal: false },
  activeMinutes: { title: 'Active', unit: 'min', decimal: false },
  sleep: { title: 'Sleep', unit: 'h', decimal: true },
  water: { title: 'Water', unit: 'L', decimal: true },
};

const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function GoalRing({ goal }: { goal: GoalProgress }) {
  const meta = LABELS[goal.type];
  const fmt = meta.decimal ? formatDecimal : formatNumber;
  const complete = goal.percent >= 100;

  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${meta.title}: ${fmt(goal.current)} of ${fmt(goal.target)} ${meta.unit}, ${goal.percent} percent`}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--surface-raised))"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={complete ? 'hsl(var(--accent))' : 'hsl(var(--chart-1))'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(goal.percent, 100) / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span className="numeric absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {goal.percent}%
        </span>
      </div>

      <div>
        <p className="text-xs font-medium text-text">{meta.title}</p>
        <p className="numeric text-2xs text-text-subtle">
          {fmt(goal.current)} / {fmt(goal.target)} {meta.unit}
        </p>
      </div>
    </li>
  );
}
