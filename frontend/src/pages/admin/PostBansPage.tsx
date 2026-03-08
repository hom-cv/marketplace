import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader, NumberInput, Textarea, Switch } from "@mantine/core";
import {
  IconPackageOff,
  IconPlus,
  IconChevronDown,
} from "@tabler/icons-react";
import { getPostBans, banPost, liftPostBan } from "@/api/admin";
import type { BanPostRequest } from "@/api/types/admin";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import shared from "@/styles/listPage.module.css";
import styles from "./PostBansPage.module.css";

export function PostBansPage() {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [postId, setPostId] = useState<number | "">("");
  const [reason, setReason] = useState("");

  const { data: bansData, isLoading, error } = useQuery({
    queryKey: ["admin-post-bans", activeOnly],
    queryFn: () => getPostBans(activeOnly),
  });

  const banMutation = useMutation({
    mutationFn: (request: BanPostRequest) => banPost(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-post-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowCreateForm(false);
      setPostId("");
      setReason("");
    },
  });

  const liftMutation = useMutation({
    mutationFn: (banId: number) => liftPostBan(banId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-post-bans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
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
        {error instanceof Error ? error.message : "Failed to load post bans"}
      </Alert>
    );
  }

  const bans = bansData?.items ?? [];

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Post Bans</h1>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Switch
            label="Active only"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.currentTarget.checked)}
          />
          <span className={styles.count}>{bansData?.total ?? 0} total</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<IconPlus size={14} />}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          Ban Post
        </Button>
      </div>

      {showCreateForm && (
        <div className={styles.createForm}>
          <p className={styles.createFormTitle}>Ban a Post</p>
          <div className={styles.formFields}>
            <NumberInput
              label="Post ID"
              placeholder="Enter post ID to ban"
              value={postId}
              onChange={(val) => setPostId(typeof val === "number" ? val : "")}
              min={1}
            />
            <Textarea
              label="Reason"
              placeholder="Reason for banning this post..."
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              minLength={5}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className={styles.formActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false);
                setPostId("");
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (typeof postId === "number") {
                  banMutation.mutate({ post_id: postId, reason });
                }
              }}
              disabled={typeof postId !== "number" || reason.length < 5 || banMutation.isPending}
            >
              {banMutation.isPending ? "Banning..." : "Ban Post"}
            </Button>
          </div>
        </div>
      )}

      {bans.length === 0 ? (
        <EmptyStateCard
          icon={<IconPackageOff size={24} />}
          title="No post bans"
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
                      <span className={styles.rowMain}>{ban.post_title}</span>
                      <span className={styles.rowSeller}>{ban.seller_username}</span>
                    </div>
                    <div className={shared.meta}>
                      <StatusBadge
                        label={ban.is_active ? "Active" : "Lifted"}
                        color={ban.is_active ? "red" : "gray"}
                      />
                      <span className={shared.date}>
                        {new Date(ban.created_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
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
                    <div className={styles.detailGrid}>
                      <div>
                        <p className={styles.detailLabel}>Post ID</p>
                        <p className={styles.detailValue}>{ban.post_id}</p>
                      </div>
                      <div>
                        <p className={styles.detailLabel}>Post Title</p>
                        <p className={styles.detailValue}>{ban.post_title}</p>
                      </div>
                      <div>
                        <p className={styles.detailLabel}>Seller</p>
                        <p className={styles.detailValue}>{ban.seller_username}</p>
                      </div>
                      <div>
                        <p className={styles.detailLabel}>Reason</p>
                        <p className={styles.detailValue}>{ban.reason}</p>
                      </div>
                      <div>
                        <p className={styles.detailLabel}>Banned By</p>
                        <p className={styles.detailValue}>{ban.banned_by_username}</p>
                      </div>
                      <div>
                        <p className={styles.detailLabel}>Date</p>
                        <p className={styles.detailValue}>
                          {new Date(ban.created_date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {ban.lifted_at && (
                        <>
                          <div>
                            <p className={styles.detailLabel}>Lifted At</p>
                            <p className={styles.detailValue}>
                              {new Date(ban.lifted_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className={styles.detailLabel}>Lifted By</p>
                            <p className={styles.detailValue}>{ban.lifted_by_username}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {ban.is_active && (
                      <div className={styles.liftButton}>
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
