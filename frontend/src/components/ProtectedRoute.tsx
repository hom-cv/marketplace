/**
 * Protected Route Component
 * Checks if user is authenticated, fetches user data if token exists but user is null,
 * redirects to "/" if not authenticated, redirects to "/verify-email" if email not verified.
 */

import { useEffect } from "react";
import { useNavigate, Outlet } from "@tanstack/react-router";
import { Center, Loader } from "@mantine/core";
import { useAuthStore } from "../stores/authStore";
import { useLogout, useCurrentUser } from "../hooks/useAuth";


export function ProtectedRoute() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { isLoading, isError } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (!token) {
      logout();
      navigate({ to: "/" });
      return;
    }

    if (isError) {
      logout();
      navigate({ to: "/" });
    }
  }, [token, isError, navigate, logout]);

  useEffect(() => {
    if (user && !user.email_verified) {
      navigate({ to: "/verify-email", search: { token: undefined } });
    }
  }, [user, navigate]);

  if (token && !user && isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (token && user) {
    if (!user.email_verified) {
      return (
        <Center h="50vh">
          <Loader size="lg" />
        </Center>
      );
    }
    return <Outlet />;
  }

  return (
    <Center h="50vh">
      <Loader size="lg" />
    </Center>
  );
}
