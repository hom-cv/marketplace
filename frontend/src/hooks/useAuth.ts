/**
 * Auth hooks using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registerUser, loginUser, getCurrentUser, verifyEmail, resendVerificationEmail } from "@/api/auth";
import { impersonateUser } from "@/api/admin";
import { useAuthStore } from "@/stores/authStore";
import type { RegisterRequest } from "@/api/types/user";
import { queryKeys } from "./queryKeys";

export function useCurrentUser() {
  const { setUser, token } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.currentUser,
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

/**
 * Admin "log in as" another user. On success, stashes the admin token, swaps in
 * the target's token, and refetches the current user so the app reflects them.
 */
export function useImpersonateMutation() {
  const queryClient = useQueryClient();
  const startImpersonation = useAuthStore((state) => state.startImpersonation);

  return useMutation({
    mutationFn: (userId: number) => impersonateUser(userId),
    onSuccess: async (data) => {
      startImpersonation(data.access_token);
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
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
    queryClient.removeQueries({ queryKey: queryKeys.currentUser });
    // Note: Backend should provide a logout endpoint to clear the cookie
    // For now, we just clear client state
  };
}

export function useVerifyEmailQuery(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.verifyEmail(token!),
    queryFn: () => verifyEmail(token!),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: () => resendVerificationEmail(),
  });
}
