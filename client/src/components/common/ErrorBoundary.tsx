import { RotateCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Last line of defence: keeps a render crash from showing a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">Something broke</h1>
          <p className="mt-2 text-sm text-text-muted">
            An unexpected error stopped the page from rendering. Reloading usually clears it.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-surface p-3 text-left text-xs text-text-subtle">
            {error.message}
          </pre>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            <RotateCw aria-hidden="true" />
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
