/**
 * Single source of truth for verification-based routing. Logged-in but
 * unverified users are kept on the verify flow; verified users are pushed off
 * the auth pages; logged-out users are left alone. While the user profile is
 * still loading after a token is set, a full-screen loader blocks the page so
 * stale content (e.g. the login form) can't be interacted with.
 */

import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader } from "@mantine/core";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";

import styles from "./VerificationGate.module.css";

const ALLOWED_WHILE_UNVERIFIED = new Set<string>([
  "/verify-email",
  "/terms",
  "/privacy",
]);

const AUTH_PAGES = new Set<string>(["/login", "/sign-up"]);

export function VerificationGate() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isError } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (token && isError) {
      logout();
    }
  }, [token, isError, logout]);

  useEffect(() => {
    if (!token || !user) return;

    if (!user.email_verified) {
      if (!ALLOWED_WHILE_UNVERIFIED.has(pathname)) {
        navigate({
          to: "/verify-email",
          search: { token: undefined },
          replace: true,
        });
      }
      return;
    }

    if (AUTH_PAGES.has(pathname)) {
      navigate({ to: "/explore", replace: true });
    }
  }, [token, user, pathname, navigate]);

  if (token && !user && !isError) {
    return (
      <div className={styles.overlay}>
        <Loader size="lg" />
      </div>
    );
  }

  return null;
}
