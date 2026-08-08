import { createContext } from "react";

import type { RegisterInput, UserProfile } from "@/core/auth/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  /** Finishes a Google/Microsoft/Facebook/Apple sign-in: stores the Supabase
   * session token already established by the OAuth redirect, then syncs/creates
   * our own `users` row for it (see AuthCallbackPage). */
  completeOAuthLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
