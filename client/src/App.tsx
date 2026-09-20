import { QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Redirect, Route, Switch } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import Challenges from '@/pages/Challenges';
import Dashboard from '@/pages/Dashboard';
import Insights from '@/pages/Insights';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Register from '@/pages/Register';
import Workouts from '@/pages/Workouts';

/*
 * Settings carries the import parsers and is visited rarely, so it is split
 * out of the entry chunk rather than taxing every dashboard load.
 */
const Settings = lazy(() => import('@/pages/Settings'));

function FullPageSpinner() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <Loader2 className="size-6 animate-spin text-text-subtle" />
    </div>
  );
}

/** Renders the app for signed-in users and bounces everyone else to /login. */
function PrivateRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Redirect to="/login" />;

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/workouts" component={Workouts} />
        <Route path="/challenges" component={Challenges} />
        <Route path="/insights" component={Insights} />
        <Route path="/settings">
          {() => (
            <Suspense fallback={<FullPageSpinner />}>
              <Settings />
            </Suspense>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

/** Keeps a signed-in user off the auth screens. */
function PublicOnly({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (user) return <Redirect to="/" />;

  return <Component />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/login">{() => <PublicOnly component={Login} />}</Route>
      <Route path="/register">{() => <PublicOnly component={Register} />}</Route>
      <Route>{() => <PrivateRoutes />}</Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <Routes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
