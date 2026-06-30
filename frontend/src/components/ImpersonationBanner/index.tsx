import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { IconUserCheck } from "@tabler/icons-react";
import { useAuthStore, useIsImpersonating } from "@/stores/authStore";
import styles from "./ImpersonationBanner.module.css";

export function ImpersonationBanner() {
  const isImpersonating = useIsImpersonating();
  const user = useAuthStore((state) => state.user);
  const stopImpersonation = useAuthStore((state) => state.stopImpersonation);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!isImpersonating) {
    return null;
  }

  const handleStop = () => {
    stopImpersonation();
    queryClient.clear();
    navigate({ to: "/explore" });
  };

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.message}>
        <IconUserCheck size={16} aria-hidden="true" />
        Viewing as <strong>{user ? user.username : "another user"}</strong>
      </span>
      <button type="button" className={styles.stopButton} onClick={handleStop}>
        Stop impersonating
      </button>
    </div>
  );
}
