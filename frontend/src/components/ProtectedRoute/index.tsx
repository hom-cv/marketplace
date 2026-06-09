/**
 * Authentication guard: requires a logged-in user, redirects to "/" otherwise.
 * Verification is handled by VerificationGate, so any logged-in user reaching a
 * protected route is already verified.
 */

import { useEffect } from "react";
import { useNavigate, Outlet } from "@tanstack/react-router";
import { Center, Loader } from "@mantine/core";
import { useAuthStore } from "@/stores/authStore";
import { useLogout, useCurrentUser } from "@/hooks/useAuth";

export function ProtectedRoute() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { isError } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (!token || isError) {
      logout();
      navigate({ to: "/" });
    }
  }, [token, isError, navigate, logout]);

  if (token && user) {
    return <Outlet />;
  }

  return (
    <Center h="50vh">
      <Loader size="lg" />
    </Center>
  );
}
