import { createContext } from 'react';
import type { PublicUser } from '@shared/schema';

export type AuthState = {
  user: PublicUser | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (input: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
};

/** Kept in its own module so AuthContext.tsx only exports a component. */
export const AuthContext = createContext<AuthState | null>(null);
