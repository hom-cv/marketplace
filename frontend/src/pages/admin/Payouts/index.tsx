import { useCallback, useState } from "react";
import { Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useAdminPayouts,
  useAdminPayoutHistory,
  useCreatePayoutMutation,
} from "@/hooks/useAdmin";
import { Alert } from "@/components/Alert";
import { getErrorMessage } from "@/utils/error";
import { PendingList } from "./PendingList";
import { HistoryList } from "./HistoryList";
import shared from "@/styles/listPage.module.css";
import styles from "./PayoutsPage.module.css";

type Tab = "pending" | "history";

export function PayoutsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payingOutIds, setPayingOutIds] = useState<Set<number>>(new Set());

  const {
    data: pendingData,
    isLoading: pendingLoading,
    error: pendingError,
  } = useAdminPayouts();

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useAdminPayoutHistory();

  const payoutMutation = useCreatePayoutMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Payout Successful",
        message: `Transfer ${data.transfer_id} created for ${formatSatangLabel(data.amount)}.`,
        color: "green",
      });
    },
    onError: (err) => {
      notifications.show({
        title: "Payout Failed",
        message: err.message,
        color: "red",
      });
    },
    onSettled: (paymentId) => {
      setPayingOutIds((prev) => {
        const next = new Set(prev);
        next.delete(paymentId);
        return next;
      });
    },
  });

  const handlePayout = useCallback(
    (id: number) => {
      setPayingOutIds((prev) => new Set(prev).add(id));
      payoutMutation.mutate(id);
    },
    [payoutMutation],
  );

  const isLoading = tab === "pending" ? pendingLoading : historyLoading;
  const error = tab === "pending" ? pendingError : historyError;

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Payouts</h1>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "pending" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("pending");
            setExpandedId(null);
          }}
        >
          Pending
          {pendingData && pendingData.total > 0 && (
            <span className={styles.tabCount}>{pendingData.total}</span>
          )}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("history");
            setExpandedId(null);
          }}
        >
          History
        </button>
      </div>

      {isLoading && (
        <div className={shared.loading}>
          <Loader size="lg" />
        </div>
      )}

      {error && (
        <Alert variant="error" title="Error">
          {getErrorMessage(error, "Failed to load payouts")}
        </Alert>
      )}

      {!isLoading && !error && tab === "pending" && (
        <PendingList
          items={pendingData?.items ?? []}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          payingOutIds={payingOutIds}
          onPayout={handlePayout}
        />
      )}

      {!isLoading && !error && tab === "history" && (
        <HistoryList
          items={historyData?.items ?? []}
          total={historyData?.total ?? 0}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      )}
    </div>
  );
}
