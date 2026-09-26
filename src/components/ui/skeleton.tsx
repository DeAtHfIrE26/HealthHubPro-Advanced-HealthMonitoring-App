import type * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Skeletons mirror the shape of the content they replace, so the layout does
 * not shift when real data lands.
 */
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden="true"
    className={cn(
      'relative overflow-hidden rounded-md bg-surface-raised',
      'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]',
      'after:bg-gradient-to-r after:from-transparent after:via-border/60 after:to-transparent',
      className,
    )}
    {...props}
  />
);
