import { useState } from "react";
import { Loader, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUserCancel } from "@tabler/icons-react";
import {
  useDismissFlaggedMessageMutation,
  useBanUserMutation,
} from "@/hooks/useAdmin";
import type { Post } from "@/api/types/post";
import { formatSize } from "@/api/types/post";
import { Button } from "@/components/Button";
import { PostImageCarousel } from "@/components/PostImageCarousel";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import type { ConversationGroup } from "@/api/types/admin";
import styles from "./FlaggedMessagesPage.module.css";

interface DetailPaneProps {
  activeGroup: ConversationGroup;
  post: Post | null | undefined;
  isLoading: boolean;
  allPatterns: string[];
  senderNameMap: Map<number, string>;
}

export function DetailPane({
  activeGroup,
  post,
  isLoading,
  allPatterns,
  senderNameMap,
}: DetailPaneProps) {
  const [banReason, setBanReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);

  const dismissMutation = useDismissFlaggedMessageMutation({
    onSuccess: ({ total, failed }) => {
      if (failed > 0) {
        notifications.show({
          title: "Partially Dismissed",
          message: `${total - failed} of ${total} flags dismissed. ${failed} failed.`,
          color: "orange",
        });
      } else {
        notifications.show({ title: "Dismissed", message: "All pending flags dismissed.", color: "gray" });
      }
    },
    onError: (err: Error) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  const banUserMutation = useBanUserMutation({
    onSuccess: () => {
      notifications.show({ title: "User Banned", message: "The user has been banned.", color: "red" });
      setShowBanForm(false);
      setBanReason("");
    },
    onError: (err: Error) => {
      notifications.show({ title: "Ban Failed", message: err.message, color: "red" });
    },
  });

  return (
    <div className={styles.detailPane}>
      {/* Listing — scrollable area */}
      <div className={styles.listingScroll}>
        {isLoading && (
          <div className={styles.detailLoading}>
            <Loader size="sm" />
          </div>
        )}

        {!isLoading && !post && (
          <div className={styles.listingUnavailable}>
            Listing unavailable
          </div>
        )}

        {post && <ListingPreview post={post} />}

        {/* Flag summary inside scroll area */}
        {!isLoading && (
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
                    user_id: activeGroup.primarySenderId,
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
  );
}

function ListingPreview({ post }: { post: Post }) {
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
            <span className={styles.sizeBadge}>
              {formatSize(post.size, post.type)}
            </span>
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
}
