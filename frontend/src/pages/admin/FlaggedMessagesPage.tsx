import { useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader, Select, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconMessageReport,
  IconUserCancel,
} from "@tabler/icons-react";
import {
  getFlaggedMessages,
  dismissFlaggedMessage,
  banUser,
  getAdminConversation,
} from "@/api/admin";
import { getPost } from "@/api/posts";
import type { MessageFlag } from "@/api/types/admin";
import type { ConversationDetail } from "@/api/types/chat";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { PostImageCarousel } from "@/components/PostImageCarousel";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import { formatShortDate } from "@/utils/date";
import styles from "./FlaggedMessagesPage.module.css";

const MESSAGES_PAGE_LIMIT = 50;

interface ConversationGroup {
  conversationId: number;
  senderUsernames: string[];
  senderIds: number[];
  primarySenderId: number;
  flags: MessageFlag[];
  pendingCount: number;
  latestDate: string;
}

function groupByConversation(flags: MessageFlag[]): ConversationGroup[] {
  const map = new Map<number, MessageFlag[]>();
  for (const flag of flags) {
    const existing = map.get(flag.conversation_id);
    if (existing) {
      existing.push(flag);
    } else {
      map.set(flag.conversation_id, [flag]);
    }
  }

  const groups: ConversationGroup[] = [];
  for (const [conversationId, convFlags] of map) {
    const sorted = convFlags.sort(
      (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
    const pendingCount = sorted.filter((f) => f.status === "PENDING").length;

    const senderMap = new Map<number, string>();
    const senderCounts = new Map<number, number>();
    for (const f of sorted) {
      if (!senderMap.has(f.sender_id)) {
        senderMap.set(f.sender_id, f.sender_username);
      }
      senderCounts.set(f.sender_id, (senderCounts.get(f.sender_id) ?? 0) + 1);
    }

    let primarySenderId = sorted[0].sender_id;
    let maxCount = 0;
    for (const [id, count] of senderCounts) {
      if (count > maxCount) {
        maxCount = count;
        primarySenderId = id;
      }
    }

    groups.push({
      conversationId,
      senderUsernames: [...senderMap.values()],
      senderIds: [...senderMap.keys()],
      primarySenderId,
      flags: sorted,
      pendingCount,
      latestDate: sorted[0].created_date,
    });
  }

  return groups.sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
}

export function FlaggedMessagesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [banReason, setBanReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const { data: flagsData, isLoading, error } = useQuery({
    queryKey: ["admin-flagged-messages", statusFilter],
    queryFn: () => getFlaggedMessages(statusFilter || undefined),
  });

  const groups = useMemo(
    () => groupByConversation(flagsData?.items ?? []),
    [flagsData]
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.conversationId === selectedConv) ?? null,
    [groups, selectedConv]
  );

  const { data: conversationDetail, isLoading: chatLoading } = useQuery({
    queryKey: ["admin-conversation", selectedConv],
    queryFn: () => getAdminConversation(selectedConv!, undefined, MESSAGES_PAGE_LIMIT),
    enabled: selectedConv !== null,
    staleTime: Infinity,
  });

  const { data: convPost } = useQuery({
    queryKey: ["admin-conversation-post", conversationDetail?.post.id],
    queryFn: async () => {
      try {
        return await getPost(conversationDetail!.post.id);
      } catch (error) {
        console.error("Failed to fetch post for admin review:", error);
        return null;
      }
    },
    enabled: !!conversationDetail?.post.id,
    staleTime: Infinity,
  });

  // Auto-scroll to first flagged message after chat loads
  const chatScrollCallback = useCallback(
    (node: HTMLDivElement | null) => {
      chatScrollRef.current = node;
      if (node && conversationDetail) {
        requestAnimationFrame(() => {
          const flaggedEl = node.querySelector("[data-flagged='true']");
          if (flaggedEl) {
            flaggedEl.scrollIntoView({ block: "center" });
          }
        });
      }
    },
    [conversationDetail]
  );

  const dismissMutation = useMutation({
    mutationFn: (flagIds: number[]) =>
      Promise.all(flagIds.map((id) => dismissFlaggedMessage(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-messages"] });
      notifications.show({ title: "Dismissed", message: "All pending flags dismissed.", color: "gray" });
    },
    onError: (err: Error) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      banUser({ user_id: userId, reason }),
    onSuccess: () => {
      notifications.show({ title: "User Banned", message: "The user has been banned.", color: "red" });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-bans"] });
      setShowBanForm(false);
      setBanReason("");
    },
    onError: (err: Error) => {
      notifications.show({ title: "Ban Failed", message: err.message, color: "red" });
    },
  });

  const handleLoadOlder = useCallback(async () => {
    if (!selectedConv || !conversationDetail?.messages.length) return;

    const oldestId = conversationDetail.messages[0].id;
    if (oldestId < 0) return;

    const container = chatScrollRef.current;
    const scrollHeightBefore = container?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const older = await getAdminConversation(selectedConv, oldestId, MESSAGES_PAGE_LIMIT);
      if (older.messages.length > 0) {
        queryClient.setQueryData<ConversationDetail>(
          ["admin-conversation", selectedConv],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: [...older.messages, ...old.messages],
              total_messages: older.total_messages,
            };
          }
        );

        requestAnimationFrame(() => {
          if (container) {
            const scrollHeightAfter = container.scrollHeight;
            container.scrollTop = scrollHeightAfter - scrollHeightBefore;
          }
        });
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
      notifications.show({ title: "Error", message: "Failed to load older messages", color: "red" });
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedConv, conversationDetail, queryClient]);

  function handleSelectConv(conversationId: number) {
    if (selectedConv === conversationId) return;
    setSelectedConv(conversationId);
    setShowBanForm(false);
    setBanReason("");
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error instanceof Error ? error.message : "Failed to load flagged messages"}
      </Alert>
    );
  }

  const flaggedMessageIds = activeGroup
    ? new Set(activeGroup.flags.map((f) => f.message_id))
    : new Set<number>();

  // Build sender name lookup from conversation participants + flags
  const senderNameMap = new Map<number, string>();
  if (activeGroup) {
    for (const f of activeGroup.flags) {
      senderNameMap.set(f.sender_id, f.sender_username);
    }
  }
  if (conversationDetail) {
    senderNameMap.set(conversationDetail.initiator.id, conversationDetail.initiator.username);
    senderNameMap.set(conversationDetail.recipient.id, conversationDetail.recipient.username);
  }

  const allPatterns = activeGroup
    ? [...new Set(activeGroup.flags.flatMap((f) => f.matched_patterns))]
    : [];

  return (
    <div className={styles.layout}>
      {/* Col 1: Conversation list */}
      <div className={styles.listPane}>
        <h1 className={styles.title}>Flagged Messages</h1>

        <div className={styles.toolbar}>
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: "", label: "All" },
              { value: "PENDING", label: "Pending" },
              { value: "DISMISSED", label: "Dismissed" },
            ]}
            clearable
            w={140}
          />
          <span className={styles.count}>
            {flagsData?.total ?? 0} flags
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
                onClick={() => handleSelectConv(group.conversationId)}
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

      {/* Col 2: Chat history */}
      <div className={styles.chatPane}>
        {!activeGroup && (
          <div className={styles.chatEmpty}>
            Select a conversation to review
          </div>
        )}

        {activeGroup && (
          <>
            <div className={styles.chatHeader}>
              <span className={styles.chatHeaderTitle}>
                {conversationDetail
                  ? `${conversationDetail.initiator.username} & ${conversationDetail.recipient.username}`
                  : activeGroup.senderUsernames.join(", ")}
              </span>
              {conversationDetail?.post && (
                <span className={styles.chatHeaderPost}>
                  re: {conversationDetail.post.title}
                </span>
              )}
            </div>

            <div className={styles.chatArea} ref={chatScrollCallback}>
              {chatLoading && (
                <div className={styles.chatLoading}>
                  <Loader size="sm" />
                </div>
              )}
              {conversationDetail && conversationDetail.messages.length < conversationDetail.total_messages && (
                <button
                  className={styles.loadOlderButton}
                  onClick={handleLoadOlder}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? "Loading..." : "Load older messages"}
                </button>
              )}
              {conversationDetail?.messages.map((msg) => {
                const isFlagged = flaggedMessageIds.has(msg.id);
                const senderName = senderNameMap.get(msg.sender_id) ?? `User #${msg.sender_id}`;
                return (
                  <div
                    key={msg.id}
                    className={`${styles.chatMsg} ${isFlagged ? styles.chatMsgFlagged : ""}`}
                    data-flagged={isFlagged || undefined}
                  >
                    <div className={styles.chatMsgHeader}>
                      <span className={styles.chatMsgSender}>{senderName}</span>
                      <span className={styles.chatMsgTime}>
                        {formatShortDate(msg.created_date)}
                      </span>
                    </div>
                    <div className={styles.chatMsgText}>{msg.content}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Col 3: Listing + actions */}
      {activeGroup && (
        <div className={styles.detailPane}>
          {/* Listing — scrollable area */}
          <div className={styles.listingScroll}>
            {chatLoading && (
              <div className={styles.detailLoading}>
                <Loader size="sm" />
              </div>
            )}

            {conversationDetail && !convPost && !chatLoading && (
              <div className={styles.listingUnavailable}>
                Listing unavailable
              </div>
            )}

            {convPost && (() => {
              const post = convPost;
              const price = parseFloat(post.price);
              const shippingCost = parseFloat(post.shipping_cost || "0");
              const imageUrls =
                post.image_urls && post.image_urls.length > 0
                  ? post.image_urls
                  : post.image_url
                    ? [post.image_url]
                    : [];

              return (
                <>
                  {imageUrls.length > 0 && (
                    <div className={styles.listingImage}>
                      <PostImageCarousel imageUrls={imageUrls} alt={post.title} />
                    </div>
                  )}

                  <div className={styles.listingDetails}>
                    {post.is_sold && (
                      <span className={styles.soldBadge}>Sold</span>
                    )}

                    <h2 className={styles.listingTitle}>{post.title}</h2>

                    <div className={styles.priceRow}>
                      <span className={styles.price}>฿{price.toLocaleString()}</span>
                      {shippingCost > 0 ? (
                        <span className={styles.shipping}>
                          + ฿{shippingCost.toLocaleString()} shipping
                        </span>
                      ) : (
                        <span className={styles.freeShipping}>Free shipping</span>
                      )}
                    </div>

                    <hr className={styles.divider} />

                    {post.size && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Size</span>
                        <span className={styles.sizeBadge}>{post.size}</span>
                      </div>
                    )}

                    {post.description && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Description</span>
                        <p className={styles.description}>{post.description}</p>
                      </div>
                    )}

                    {post.measurements && (
                      <MeasurementsDisplay measurements={post.measurements} />
                    )}

                    <hr className={styles.divider} />

                    <div className={styles.sellerRow}>
                      <div className={styles.sellerAvatar}>
                        {post.user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.sellerName}>@{post.user.username}</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Flag summary inside scroll area */}
            {conversationDetail && (
              <div className={styles.flagSummary}>
                <span className={styles.flagStat}>
                  {activeGroup.flags.length} flag{activeGroup.flags.length !== 1 && "s"} &middot; {activeGroup.pendingCount} pending
                </span>
                {allPatterns.length > 0 && (
                  <div className={styles.patternTags}>
                    {allPatterns.map((p) => (
                      <span key={p} className={styles.patternTag}>{p}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions — pinned to bottom, never scrolls */}
          <div className={styles.actionsSection}>
            {activeGroup.pendingCount > 0 && !showBanForm && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const pendingIds = activeGroup.flags
                    .filter((f) => f.status === "PENDING")
                    .map((f) => f.id);
                  dismissMutation.mutate(pendingIds);
                }}
                disabled={dismissMutation.isPending}
                fullWidth
              >
                {dismissMutation.isPending
                  ? "Dismissing..."
                  : `Dismiss All (${activeGroup.pendingCount})`}
              </Button>
            )}

            {!showBanForm ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconUserCancel size={14} />}
                onClick={() => {
                  setShowBanForm(true);
                  setBanReason(`Flagged message: ${allPatterns.join(", ")}`);
                }}
                fullWidth
              >
                Ban User
              </Button>
            ) : (
              <div className={styles.banForm}>
                {activeGroup.senderIds.length > 1 && (
                  <div className={styles.banTarget}>
                    Banning: {senderNameMap.get(activeGroup.primarySenderId) ?? `User #${activeGroup.primarySenderId}`} (most flagged)
                  </div>
                )}
                <Textarea
                  label="Ban Reason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.currentTarget.value)}
                  minRows={2}
                  maxRows={3}
                  placeholder="Reason for banning this user..."
                />
                <div className={styles.banActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowBanForm(false);
                      setBanReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      banUserMutation.mutate({
                        userId: activeGroup.primarySenderId,
                        reason: banReason,
                      })
                    }
                    disabled={banReason.length < 5 || banUserMutation.isPending}
                  >
                    {banUserMutation.isPending ? "Banning..." : "Confirm Ban"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
