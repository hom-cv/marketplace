/**
 * Protected Route Component
 * Checks if user is authenticated, fetches user data if token exists but user is null,
 * redirects to "/" if not authenticated.
 */

import { useEffect } from "react";
import { useNavigate, Outlet } from "@tanstack/react-router";
import { Center, Loader } from "@mantine/core";
import { useAuthStore } from "../stores/authStore";
import { useCurrentUser } from "../hooks/useAuth";

export function ProtectedRoute() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();
  const { isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (!token) {
      navigate({ to: "/" });
      return;
    }

    if (isError) {
      navigate({ to: "/" });
    }
  }, [token, isError, navigate]);

  if (token && !user && isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (isAuthenticated && user) {
    return <Outlet />;
  }

  return (
    <Center h="50vh">
      <Loader size="lg" />
    </Center>
  );
}
