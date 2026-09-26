import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder for the lazily loaded ActivityChart.
 *
 * It mirrors the real control row rather than being one grey block, because a
 * fixed-height box only matches at widths where the row does not wrap. At
 * 390px the eight filter buttons wrap to two lines and the chart block is
 * 344px, not the 304px a flat skeleton reserved -- a measured 0.03 layout
 * shift every time the chunk landed. Reusing the same flex rules and the same
 * button heights makes the reservation correct at any width, with no magic
 * number to keep in sync.
 *
 * Deliberately NOT exported from ActivityChart: it has to stay in the eager
 * bundle, or the fallback would need the chunk it is covering for.
 */

/** Widths approximate the real button labels, so the row breaks alike. */
const METRIC_WIDTHS = ['w-[52px]', 'w-[68px]', 'w-[56px]', 'w-[52px]', 'w-[54px]'];
const RANGE_WIDTHS = ['w-[38px]', 'w-[42px]', 'w-[42px]'];

export function ChartSkeleton() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {METRIC_WIDTHS.map((w) => (
            <Skeleton key={w} className={`h-8 ${w}`} />
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          {RANGE_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-8 ${w}`} />
          ))}
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
