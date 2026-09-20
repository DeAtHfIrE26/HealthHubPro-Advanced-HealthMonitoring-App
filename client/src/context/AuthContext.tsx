import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, type ReactNode } from 'react';
import type { PublicUser } from '@shared/schema';
import { AuthContext, type AuthState } from '@/context/auth-context';
import { ApiError, api } from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return (await api.me()).user;
      } catch (error) {
        // Older sessions or a proxy may still surface 401 here; treat it as
        // "signed out" rather than a failure so the app still renders.
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const setUser = useCallback(
    (user: PublicUser | null) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
    [queryClient],
  );

  const value = useMemo<AuthState>(
    () => ({
      user: data ?? null,
      isLoading,
      signIn: async (username, password) => {
        const { user } = await api.login({ username, password });
        setUser(user);
      },
      signUp: async (input) => {
        const { user } = await api.register(input);
        setUser(user);
      },
      signInAsDemo: async () => {
        const { user } = await api.demoLogin();
        setUser(user);
      },
      signOut: async () => {
        await api.logout();
        setUser(null);
        // Drop every cached query so the next user never sees stale data.
        queryClient.clear();
      },
    }),
    [data, isLoading, queryClient, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
