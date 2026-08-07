import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiClient, AUTH_UNAUTHORIZED_EVENT } from "@/core/api/client";
import { tokenStore } from "@/core/api/tokenStore";
import { AuthContext, type AuthStatus } from "@/core/auth/context";
import type { RegisterInput, UserProfile } from "@/core/auth/types";

interface TokenResponse {
  access_token: string;
}

async function fetchProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>("/auth/me");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function hydrate(): Promise<void> {
      if (!tokenStore.get()) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const profile = await fetchProfile();
        if (!cancelled) {
          setUser(profile);
          setStatus("authenticated");
        }
      } catch {
        tokenStore.clear();
        if (!cancelled) setStatus("unauthenticated");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized(): void {
      setUser(null);
      setStatus("unauthenticated");
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const { data } = await apiClient.post<TokenResponse>("/auth/login", { email, password });
    tokenStore.set(data.access_token);
    const profile = await fetchProfile();
    setUser(profile);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<void> => {
      await apiClient.post("/auth/register", input);
      await login(input.email, input.password);
    },
    [login],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      tokenStore.clear();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
