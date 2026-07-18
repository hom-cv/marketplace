import { useLayoutEffect, useRef } from "react";
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
  const bannerRef = useRef<HTMLDivElement>(null);

  // Publish the banner's real height so fixed layouts (e.g. the chat page,
  // pinned to top: 60px) can offset below it. Recomputed on resize for wrap.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = bannerRef.current;
    if (!el) return;
    const sync = () =>
      root.style.setProperty("--impersonation-height", `${el.offsetHeight}px`);
    sync();
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      root.style.removeProperty("--impersonation-height");
    };
  }, [isImpersonating]);

  if (!isImpersonating) {
    return null;
  }

  const handleStop = () => {
    stopImpersonation();
    queryClient.clear();
    navigate({ to: "/explore" });
  };

  return (
    <div className={styles.banner} role="alert" ref={bannerRef}>
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
