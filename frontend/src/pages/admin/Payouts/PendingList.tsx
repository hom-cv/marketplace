import { IconCash, IconChevronDown } from "@tabler/icons-react";
import type { PayoutItem } from "@/api/types/admin";
import { Button } from "@/components/Button";
import { DetailItem } from "@/components/DetailItem";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSatangLabel } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";
import shared from "@/styles/listPage.module.css";
import styles from "./PayoutsPage.module.css";

interface PendingListProps {
  items: PayoutItem[];
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  payingOutId: number | null;
  onPayout: (id: number) => void;
  isPaying: boolean;
}

export function PendingList({
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
