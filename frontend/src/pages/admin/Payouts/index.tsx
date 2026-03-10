import { useState } from "react";
import { Loader } from "@mantine/core";
import {
  IconCash,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  useAdminPayouts,
  useAdminPayoutHistory,
  useCreatePayoutMutation,
} from "@/hooks/useAdmin";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailItem } from "@/components/DetailItem";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { formatSatang } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";
import { getErrorMessage } from "@/utils/error";
import shared from "@/styles/listPage.module.css";
import styles from "./PayoutsPage.module.css";

type Tab = "pending" | "history";

function formatSatangLabel(satang: number): string {
  return `${formatSatangLabel(satang)} THB`;
}

export function PayoutsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payingOutId, setPayingOutId] = useState<number | null>(null);

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
    onSuccess: () => setPayingOutId(null),
  });

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
          payingOutId={payingOutId}
          onPayout={(id) => {
            setPayingOutId(id);
            payoutMutation.mutate(id);
          }}
          isPaying={payoutMutation.isPending}
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

interface PendingListProps {
  items: Array<{
    payment_id: number;
    post_title: string;
    seller_username: string;
    buyer_username: string;
    payment_method: string;
    amount: number;
    seller_payout: number;
    paid_at: string | null;
    delivered_at: string | null;
  }>;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  payingOutId: number | null;
  onPayout: (id: number) => void;
  isPaying: boolean;
}

function PendingList({
  items,
  expandedId,
  setExpandedId,
  payingOutId,
  onPayout,
  isPaying,
}: PendingListProps) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        icon={<IconCash size={24} />}
        title="No pending payouts"
        description="All delivered orders have been paid out."
      />
    );
  }

  return (
    <div className={shared.list}>
      {items.map((payout) => {
        const isExpanded = expandedId === payout.payment_id;

        return (
          <div key={payout.payment_id} className={shared.item}>
            <button
              type="button"
              className={shared.row}
              onClick={() =>
                setExpandedId(isExpanded ? null : payout.payment_id)
              }
              aria-expanded={isExpanded}
            >
              <div className={shared.info}>
                <div className={shared.topRow}>
                  <span className={shared.itemTitle}>{payout.post_title}</span>
                  <span className={styles.amount}>
                    {formatSatangLabel(payout.seller_payout)}
                  </span>
                </div>
                <div className={shared.meta}>
                  <StatusBadge label="Awaiting Payout" color="orange" />
                  <span className={shared.date}>
                    {payout.delivered_at
                      ? formatShortDate(payout.delivered_at)
                      : "\u2014"}
                  </span>
                </div>
              </div>
              <IconChevronDown
                size={18}
                className={`${shared.expandIcon} ${isExpanded ? shared.expandIconOpen : ""}`}
                aria-hidden="true"
              />
            </button>

            {isExpanded && (
              <div className={shared.expandedContent}>
                <div className={shared.detailGrid}>
                  <DetailItem label="Payment ID">
                    {payout.payment_id}
                  </DetailItem>
                  <DetailItem label="Seller">
                    {payout.seller_username}
                  </DetailItem>
                  <DetailItem label="Buyer">
                    {payout.buyer_username}
                  </DetailItem>
                  <DetailItem label="Method">
                    {payout.payment_method}
                  </DetailItem>
                  <DetailItem label="Total Charged">
                    {formatSatangLabel(payout.amount)}
                  </DetailItem>
                  <DetailItem label="Seller Payout">
                    {formatSatangLabel(payout.seller_payout)}
                  </DetailItem>
                  {payout.paid_at && (
                    <DetailItem label="Paid At">
                      {formatShortDate(payout.paid_at)}
                    </DetailItem>
                  )}
                  {payout.delivered_at && (
                    <DetailItem label="Delivered At">
                      {formatShortDate(payout.delivered_at)}
                    </DetailItem>
                  )}
                </div>
                <div className={styles.expandedActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onPayout(payout.payment_id)}
                    disabled={isPaying && payingOutId === payout.payment_id}
                  >
                    {isPaying && payingOutId === payout.payment_id
                      ? "Processing..."
                      : "Transfer to Seller"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface HistoryListProps {
  items: Array<{
    payment_id: number;
    post_title: string;
    seller_username: string;
    buyer_username: string;
    payment_method: string;
    amount: number;
    seller_payout: number;
    paid_at: string | null;
    delivered_at: string | null;
    transferred_at: string | null;
    omise_transfer_id: string | null;
  }>;
  total: number;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
}

function HistoryList({
  items,
  total,
  expandedId,
  setExpandedId,
}: HistoryListProps) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        icon={<IconCash size={24} />}
        title="No payout history"
        description="Completed payouts will appear here."
      />
    );
  }

  return (
    <>
      <div className={shared.toolbar}>
        <div className={shared.toolbarLeft}>
          <span className={shared.count}>{total} completed</span>
        </div>
      </div>
      <div className={shared.list}>
        {items.map((payout) => {
          const isExpanded = expandedId === payout.payment_id;

          return (
            <div key={payout.payment_id} className={shared.item}>
              <button
                type="button"
                className={shared.row}
                onClick={() =>
                  setExpandedId(isExpanded ? null : payout.payment_id)
                }
                aria-expanded={isExpanded}
              >
                <div className={shared.info}>
                  <div className={shared.topRow}>
                    <span className={shared.itemTitle}>
                      {payout.post_title}
                    </span>
                    <span className={styles.amount}>
                      {formatSatangLabel(payout.seller_payout)}
                    </span>
                  </div>
                  <div className={shared.meta}>
                    <StatusBadge label="Transferred" color="green" />
                    <span className={shared.date}>
                      {payout.transferred_at
                        ? formatShortDate(payout.transferred_at)
                        : "\u2014"}
                    </span>
                  </div>
                </div>
                <IconChevronDown
                  size={18}
                  className={`${shared.expandIcon} ${isExpanded ? shared.expandIconOpen : ""}`}
                  aria-hidden="true"
                />
              </button>

              {isExpanded && (
                <div className={shared.expandedContent}>
                  <div className={shared.detailGrid}>
                    <DetailItem label="Payment ID">
                      {payout.payment_id}
                    </DetailItem>
                    <DetailItem label="Transfer ID">
                      {payout.omise_transfer_id ?? "\u2014"}
                    </DetailItem>
                    <DetailItem label="Seller">
                      {payout.seller_username}
                    </DetailItem>
                    <DetailItem label="Buyer">
                      {payout.buyer_username}
                    </DetailItem>
                    <DetailItem label="Method">
                      {payout.payment_method}
                    </DetailItem>
                    <DetailItem label="Total Charged">
                      {formatSatangLabel(payout.amount)}
                    </DetailItem>
                    <DetailItem label="Seller Payout">
                      {formatSatangLabel(payout.seller_payout)}
                    </DetailItem>
                    {payout.paid_at && (
                      <DetailItem label="Paid At">
                        {formatShortDate(payout.paid_at)}
                      </DetailItem>
                    )}
                    {payout.transferred_at && (
                      <DetailItem label="Transferred At">
                        {formatShortDate(payout.transferred_at)}
                      </DetailItem>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
