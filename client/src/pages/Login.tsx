import { Activity, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

const DEMO = { username: 'demo', password: 'demo1234' };

export default function Login() {
  const [, navigate] = useLocation();
  const { signIn, signInAsDemo } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'form' | 'demo' | null>(null);

  const run = async (action: () => Promise<void>, kind: 'form' | 'demo') => {
    setError(null);
    setPending(kind);
    try {
      await action();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
      setPending(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col justify-center px-4 py-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="flex size-11 items-center justify-center rounded-lg bg-accent">
              <Activity className="size-5 text-accent-ink" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-text-muted">Sign in to pick up where you left off.</p>
          </div>

          {/* The demo path comes first: a visitor must never need to sign up. */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-medium text-text">Just looking around?</p>
            <p className="mt-1 text-xs text-text-muted">
              Open a fully populated account — no sign-up, no credentials needed.
            </p>
            <Button
              className="mt-3 w-full"
              onClick={() => void run(signInAsDemo, 'demo')}
              disabled={pending !== null}
            >
              {pending === 'demo' ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {pending === 'demo' ? 'Opening demo…' : 'Try the demo'}
            </Button>
            <p className="numeric mt-2 text-center text-2xs text-text-subtle">
              or sign in manually with {DEMO.username} / {DEMO.password}
            </p>
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-2xs uppercase text-text-subtle">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => signIn(username, password), 'form');
            }}
            noValidate
          >
            {error ? (
              <Alert tone="error" className="mb-4">
                {error}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={error !== null}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error !== null}
                />
              </div>

              <Button type="submit" variant="secondary" disabled={pending !== null}>
                {pending === 'form' ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                {pending === 'form' ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            No account?{' '}
            <Link
              href="/register"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
