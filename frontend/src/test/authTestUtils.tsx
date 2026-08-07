import type { ReactNode } from "react";

import { AuthContext, type AuthContextValue } from "@/core/auth/context";
import type { UserProfile } from "@/core/auth/types";

/** Renders children with a fixed, fake auth context — used by tests that need
 * a specific role's UI without going through real network-backed login.
 */
export function withFakeAuth(user: UserProfile, children: ReactNode): React.JSX.Element {
  const value: AuthContextValue = {
    user,
    status: "authenticated",
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "faculty@example.edu",
    full_name: "Dr. Ada Faculty",
    role: "faculty",
    department: "Computer Science",
    is_active: true,
    ...overrides,
  };
}
