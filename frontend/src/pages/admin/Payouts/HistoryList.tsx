import { IconCash, IconChevronDown } from "@tabler/icons-react";
import type { PayoutHistoryItem } from "@/api/types/admin";
import { DetailItem } from "@/components/DetailItem";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSatangLabel } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";
import shared from "@/styles/listPage.module.css";
import styles from "./PayoutsPage.module.css";

interface HistoryListProps {
  items: PayoutHistoryItem[];
  total: number;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
}

export function HistoryList({
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
                    <DetailItem label="Stripe Transfer ID">
                      {payout.stripe_transfer_id ?? "\u2014"}
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
