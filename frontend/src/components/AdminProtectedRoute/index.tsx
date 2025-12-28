/**
 * Admin Protected Route Component
 * Extends ProtectedRoute to also check if user is an admin.
 * Redirects to /app if user is not an admin.
 */

import { useEffect } from "react";
import { useNavigate, Outlet } from "@tanstack/react-router";
import { Center, Loader } from "@mantine/core";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentUser } from "@/hooks/useAuth";
export function AdminProtectedRoute() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  useCurrentUser();

  useEffect(() => {
    if (user && !user.is_admin) {
      navigate({ to: "/app" });
    }
  }, [user, navigate]);

  if (user?.is_admin) {
    return <Outlet />;
  }

  return (
    <Center h="50vh">
      <Loader size="lg" />
    </Center>
  );
}