import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { IconUserCheck } from "@tabler/icons-react";
import { useAuthStore, useIsImpersonating } from "@/stores/authStore";
import { queryKeys } from "@/hooks/queryKeys";
import styles from "./ImpersonationBanner.module.css";

/**
 * Persistent banner shown while an admin is impersonating another user.
 * Always rendered (above the app layout) so the exit is reachable even when the
 * impersonated user is routed elsewhere (e.g. to email verification).
 */
export function ImpersonationBanner() {
  const isImpersonating = useIsImpersonating();
  const user = useAuthStore((state) => state.user);
  const stopImpersonation = useAuthStore((state) => state.stopImpersonation);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!isImpersonating) {
    return null;
  }

  const handleStop = async () => {
    stopImpersonation();
    await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    navigate({ to: "/explore" });
  };

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.message}>
        <IconUserCheck size={16} aria-hidden="true" />
        Viewing as{" "}
        <strong>{user ? user.username : "another user"}</strong>
      </span>
      <button type="button" className={styles.stopButton} onClick={handleStop}>
        Stop impersonating
      </button>
    </div>
  );
}
