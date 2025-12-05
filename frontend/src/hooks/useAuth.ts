/**
 * Auth hooks using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registerUser, loginUser, getCurrentUser } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import type { RegisterRequest } from "../api/types";

export function useCurrentUser() {
  const { setUser, token } = useAuthStore();

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await getCurrentUser();
      setUser(user);
      return user;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const { setToken } = useAuthStore();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginUser(email, password),
    onSuccess: async (data) => {
      setToken(data.access_token);
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (data: RegisterRequest) => registerUser(data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    queryClient.removeQueries({ queryKey: ["currentUser"] });
    // Note: Backend should provide a logout endpoint to clear the cookie
    // For now, we just clear client state
  };
}
