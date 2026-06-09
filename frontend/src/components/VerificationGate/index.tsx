/**
 * Single source of truth for verification-based routing. Logged-in but
 * unverified users are kept on the verify flow; verified users are pushed off
 * the auth pages; logged-out users are left alone.
 */

import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentUser } from "@/hooks/useAuth";

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

  useCurrentUser();

  useEffect(() => {
    if (!token || !user) return;

    if (!user.email_verified) {
      if (!ALLOWED_WHILE_UNVERIFIED.has(pathname)) {
        navigate({ to: "/verify-email", search: { token: undefined } });
      }
      return;
    }

    if (AUTH_PAGES.has(pathname)) {
      navigate({ to: "/explore" });
    }
  }, [token, user, pathname, navigate]);

  return null;
}
