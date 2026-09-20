import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="numeric font-display text-6xl font-bold text-border-strong">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-text-muted">
        That page does not exist. It may have moved, or the link may be wrong.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">
          <ArrowLeft aria-hidden="true" />
          Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
