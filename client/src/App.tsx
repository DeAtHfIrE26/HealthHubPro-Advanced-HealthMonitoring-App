import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Workouts from "@/pages/Workouts";
import Challenges from "@/pages/Challenges";
import Nutrition from "@/pages/Nutrition";
import AIInsights from "@/pages/AIInsights";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNavigation from "@/components/layout/MobileNavigation";
import { AuthProvider } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) {
  const { user } = useAuth();
  
  if (!user) {
    // Redirect to login if not authenticated
    window.location.href = '/login';
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/workouts">
        {() => <ProtectedRoute component={Workouts} />}
      </Route>
      <Route path="/challenges">
        {() => <ProtectedRoute component={Challenges} />}
      </Route>
      <Route path="/nutrition">
        {() => <ProtectedRoute component={Nutrition} />}
      </Route>
      <Route path="/insights">
        {() => <ProtectedRoute component={AIInsights} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Separate component that uses useAuth to avoid circular dependency
function AuthenticatedApp() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && <Header />}
      <main className={`flex-grow ${!isAuthPage ? 'pt-16 pb-16 md:pb-0' : ''}`}>
        <Router />
      </main>
      {isMobile && !isAuthPage && <MobileNavigation />}
      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
