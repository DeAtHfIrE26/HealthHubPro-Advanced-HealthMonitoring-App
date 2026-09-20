import {
  Activity,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { OfflineBanner } from '@/components/common/States';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/challenges', label: 'Challenges', icon: Trophy },
  { href: '/insights', label: 'Insights', icon: Sparkles },
];

function useIsPersistent(): boolean | undefined {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
    staleTime: Infinity,
    retry: false,
  });
  return data?.persistent;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const online = useOnlineStatus();
  const persistent = useIsPersistent();

  const isActive = (href: string) => (href === '/' ? location === '/' : location.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {!online && <OfflineBanner />}

      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent">
              <Activity className="size-4 text-accent-ink" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold tracking-tight">HealthHubPro</span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive(href)
                    ? 'bg-surface-raised text-text'
                    : 'text-text-muted hover:bg-surface-raised hover:text-text',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {persistent === false && (
              <Badge
                tone="warn"
                className="hidden sm:inline-flex"
                title="No database is connected, so data resets when the server restarts."
              >
                Demo mode
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-surface-raised"
                    aria-label="Account menu"
                  >
                    <Avatar>
                      <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.firstName} {user.lastName}
                  </DropdownMenuLabel>
                  <div className="px-2 pb-1 text-xs text-text-subtle">@{user.username}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-12">
        {children}
      </main>

      {/* Bottom bar on phones; the header nav is hidden there. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors',
                isActive(href) ? 'text-accent' : 'text-text-subtle',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
