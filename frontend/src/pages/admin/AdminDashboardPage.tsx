import { useQuery } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import {
  IconFlag,
  IconUserOff,
  IconPackageOff,
} from "@tabler/icons-react";
import { getAdminStats } from "@/api/admin";
import { Alert } from "@/components/Alert";
import shared from "@/styles/listPage.module.css";
import styles from "./AdminDashboardPage.module.css";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={styles.statCard} data-color={color}>
      <div className={styles.iconBox}>{icon}</div>
      <div>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
  });

  if (isLoading) {
    return (
      <div className={shared.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error instanceof Error ? error.message : "Failed to load admin stats"}
      </Alert>
    );
  }

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Admin Dashboard</h1>
      <p className={styles.subtitle}>Overview of moderation and management activities.</p>

      <div className={styles.statsGrid}>
        <StatCard
          label="Pending Reports"
          value={stats?.pending_reports ?? 0}
          icon={<IconFlag size={22} />}
          color="orange"
        />
        <StatCard
          label="Active User Bans"
          value={stats?.active_user_bans ?? 0}
          icon={<IconUserOff size={22} />}
          color="red"
        />
        <StatCard
          label="Active Post Bans"
          value={stats?.active_post_bans ?? 0}
          icon={<IconPackageOff size={22} />}
          color="violet"
        />
      </div>
    </div>
  );
}
