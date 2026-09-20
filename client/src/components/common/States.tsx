import { AlertTriangle, RotateCw, WifiOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-raised">
        <Icon className="size-5 text-text-subtle" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function ErrorState({
  title = 'Could not load this',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card
      className={cn('flex flex-col items-center px-6 py-10 text-center', className)}
      role="alert"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="size-5 text-danger" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </Card>
  );
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warn/15 px-4 py-2 text-sm text-warn"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      You are offline. Changes will not be saved until the connection returns.
    </div>
  );
}
