import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  info: { icon: Info, cls: 'border-info/30 bg-info/10 text-info' },
  success: { icon: CheckCircle2, cls: 'border-accent/30 bg-accent/10 text-accent' },
  warn: { icon: AlertTriangle, cls: 'border-warn/30 bg-warn/10 text-warn' },
  error: { icon: XCircle, cls: 'border-danger/30 bg-danger/10 text-danger' },
} as const;

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof TONES;
  title?: string;
};

export function Alert({ tone = 'info', title, className, children, ...props }: AlertProps) {
  const { icon: Icon, cls } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border p-3 text-sm', cls, className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className={cn(title && 'mt-0.5', 'text-text-muted')}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
