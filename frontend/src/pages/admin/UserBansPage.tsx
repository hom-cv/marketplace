import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader, NumberInput, Textarea, Switch } from "@mantine/core";
import {
  IconUserOff,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import { getUserBans, banUser, liftUserBan } from "@/api/admin";
import type { BanUserRequest } from "@/api/types/admin";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailItem } from "@/components/DetailItem";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { formatShortDate } from "@/utils/date";
import shared from "@/styles/listPage.module.css";
import styles from "./UserBansPage.module.css";

export function UserBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userId, setUserId] = useState<number | "">("");
  const [reason, setReason] = useState("");

  const { data: bansData, isLoading, error } = useQuery({
    queryKey: ["admin-user-bans", activeOnly],
    queryFn: () => getUserBans(activeOnly),
  });

  const banMutation = useMutation({
    mutationFn: (request: BanUserRequest) => banUser(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setShowCreateForm(false);
      setUserId("");
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: (banId: number) => liftUserBan(banId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
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
        {error instanceof Error ? error.message : "Failed to load user bans"}
      </Alert>
    );
  }

  const bans = bansData?.items ?? [];

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>User Bans</h1>

      <div className={shared.toolbar}>
        <div className={shared.toolbarLeft}>
          <Switch
            label="Active only"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.currentTarget.checked)}
          />
          <span className={shared.count}>{bansData?.total ?? 0} total</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<IconPlus size={14} />}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          Ban User
        </Button>
      </div>

      {showCreateForm && (
        <div className={shared.createForm}>
          <p className={shared.createFormTitle}>Ban a User</p>
          <div className={shared.formFields}>
            <NumberInput
              label="User ID"
              placeholder="Enter user ID to ban"
              value={userId}
              onChange={(val) => setUserId(typeof val === "number" ? val : "")}
              min={1}
            />
            <Textarea
              label="Reason"
              placeholder="Reason for banning this user..."
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              minLength={5}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className={shared.formActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false);
                setUserId("");
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (typeof userId === "number") {
                  banMutation.mutate({ user_id: userId, reason });
                }
              }}
              disabled={typeof userId !== "number" || reason.length < 5 || banMutation.isPending}
            >
              {banMutation.isPending ? "Banning..." : "Ban User"}
            </Button>
          </div>
        </div>
      )}

      {bans.length === 0 ? (
        <EmptyStateCard
          icon={<IconUserOff size={24} />}
          title="No user bans"
          description={activeOnly ? "No active bans found." : "No bans found."}
        />
      ) : (
        <div className={shared.list}>
          {bans.map((ban) => {
            const isExpanded = expandedId === ban.id;

            return (
              <div key={ban.id} className={shared.item}>
                <button
                  type="button"
                  className={shared.row}
                  onClick={() => setExpandedId(isExpanded ? null : ban.id)}
                  aria-expanded={isExpanded}
                >
                  <div className={shared.info}>
                    <div className={shared.topRow}>
                      <span className={shared.itemTitle}>{ban.username}</span>
                      <span className={styles.rowReason}>{ban.reason}</span>
                    </div>
                    <div className={shared.meta}>
                      <StatusBadge
                        label={ban.is_active ? "Active" : "Lifted"}
                        color={ban.is_active ? "red" : "gray"}
                      />
                      <span className={shared.date}>
                        {formatShortDate(ban.created_date)}
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
                      <DetailItem label="User ID">{ban.user_id}</DetailItem>
                      <DetailItem label="Reason">{ban.reason}</DetailItem>
                      <DetailItem label="Banned By">{ban.banned_by_username}</DetailItem>
                      <DetailItem label="Date">{formatShortDate(ban.created_date)}</DetailItem>
                      {ban.lifted_at && (
                        <>
                          <DetailItem label="Lifted At">{formatShortDate(ban.lifted_at)}</DetailItem>
                          <DetailItem label="Lifted By">{ban.lifted_by_username}</DetailItem>
                        </>
                      )}
                    </div>
                    {ban.is_active && (
                      <div className={styles.expandedActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => liftMutation.mutate(ban.id)}
                          disabled={liftMutation.isPending}
                        >
                          {liftMutation.isPending ? "Lifting..." : "Lift Ban"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
