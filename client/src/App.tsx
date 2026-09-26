import { QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Redirect, Route, Switch } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Register from '@/pages/Register';

/*
 * Every route except the two a visitor can land on cold is split out.
 *
 * Dashboard stays eager because it is the landing page for a signed-in user,
 * and Login because it is the landing page for everyone else -- splitting
 * either would add a round trip to the only paint that matters. The rest are
 * reached by a deliberate click, by which time the chunk is already being
 * fetched, and keeping them in the entry chunk meant every first load parsed
 * and evaluated four pages nobody had asked for yet.
 */
const Workouts = lazy(() => import('@/pages/Workouts'));
const Challenges = lazy(() => import('@/pages/Challenges'));
const Insights = lazy(() => import('@/pages/Insights'));
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
      {/*
        One boundary around the Switch rather than one per route: the fallback
        is identical, and a split route that resolves before paint never shows
        it anyway.
      */}
      <Suspense fallback={<FullPageSpinner />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/workouts" component={Workouts} />
          <Route path="/challenges" component={Challenges} />
          <Route path="/insights" component={Insights} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
