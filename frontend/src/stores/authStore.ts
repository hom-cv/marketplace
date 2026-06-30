/**
 * Auth store using Zustand
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { User } from "@/api/types/user";

interface AuthState {
  user: User | null;
  token: string | null;
  /** Stashed admin token while impersonating another user; null otherwise. */
  adminToken: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  /** Begin impersonating: stash the current (admin) token, swap in the target's. */
  startImpersonation: (targetToken: string) => void;
  /** Stop impersonating: restore the stashed admin token. */
  stopImpersonation: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        adminToken: null,
        setUser: (user) => set({ user }),
        setToken: (token) => set({ token }),
        startImpersonation: (targetToken) =>
          set({ adminToken: get().token, token: targetToken, user: null }),
        stopImpersonation: () =>
          set({ token: get().adminToken, adminToken: null, user: null }),
        logout: () => set({ user: null, token: null, adminToken: null }),
      }),
      {
        name: "auth-storage",
      }
    ),
    { name: "authStore" }
  )
);

/** True while an admin is impersonating another user. */
export const useIsImpersonating = () =>
  useAuthStore((state) => state.adminToken !== null);

export const useIsAuthenticated = () =>
  useAuthStore((state) => state.token !== null || state.user !== null);
