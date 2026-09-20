import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-text',
      'transition-colors duration-150 placeholder:text-text-subtle',
      'hover:border-border-strong focus:border-accent',
      'disabled:cursor-not-allowed disabled:opacity-60',
      'aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
