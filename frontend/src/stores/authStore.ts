/**
 * Auth store using Zustand
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { User } from "@/api/types";

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        setUser: (user) => set({ user }),
        setToken: (token) => set({ token }),
        logout: () => set({ user: null, token: null }),
      }),
      {
        name: "auth-storage",
      }
    ),
    { name: "authStore" }
  )
);

export const useIsAuthenticated = () =>
  useAuthStore((state) => state.token !== null || state.user !== null);
