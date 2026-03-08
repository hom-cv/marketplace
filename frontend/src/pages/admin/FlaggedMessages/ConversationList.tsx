import { Select } from "@mantine/core";
import { IconMessageReport } from "@tabler/icons-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { formatShortDate } from "@/utils/date";
import type { ConversationGroup } from "@/api/types/admin";
import styles from "../FlaggedMessagesPage.module.css";

interface ConversationListProps {
  groups: ConversationGroup[];
  totalFlags: number;
  selectedConv: number | null;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  onSelectConversation: (conversationId: number) => void;
}

export function ConversationList({
  groups,
  totalFlags,
  selectedConv,
  statusFilter,
  onStatusFilterChange,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <div className={styles.listPane}>
      <h1 className={styles.title}>Flagged Messages</h1>

      <div className={styles.toolbar}>
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={onStatusFilterChange}
          data={[
            { value: "", label: "All" },
            { value: "PENDING", label: "Pending" },
            { value: "DISMISSED", label: "Dismissed" },
          ]}
          clearable
          w={140}
        />
        <span className={styles.count}>
          {totalFlags} flags
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyStateCard
          icon={<IconMessageReport size={24} />}
          title="No flagged messages"
          description="No messages match the current filter."
        />
      ) : (
        <div className={styles.list}>
          {groups.map((group) => (
            <button
              key={group.conversationId}
              type="button"
              className={`${styles.listRow} ${selectedConv === group.conversationId ? styles.listRowActive : ""}`}
              onClick={() => onSelectConversation(group.conversationId)}
            >
              <div className={styles.rowInfo}>
                <div className={styles.rowTop}>
                  <span className={styles.senderName}>
                    {group.senderUsernames.join(", ")}
                  </span>
                  {group.pendingCount > 0 && (
                    <StatusBadge
                      label={`${group.pendingCount}`}
                      color="orange"
                    />
                  )}
                </div>
                <div className={styles.rowMeta}>
                  <span className={styles.flagCount}>
                    {group.flags.length} flag{group.flags.length !== 1 && "s"}
                  </span>
                  <span className={styles.rowDate}>
                    {formatShortDate(group.latestDate)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
