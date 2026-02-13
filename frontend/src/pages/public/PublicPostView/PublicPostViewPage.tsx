/**
 * Post View Page - View a single post
 * Works for both authenticated and unauthenticated users
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Loader, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconShoppingCart,
  IconArrowLeft,
  IconChevronRight,
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { PostImageCarousel } from "@/components/PostImageCarousel";
import { ReportModal } from "@/components/ReportModal";
import { EarningsPreview } from "@/components/EarningsPreview";
import type { ReportType } from "@/api/types/admin";
import styles from "./PublicPostViewPage.module.css";

export function PublicPostViewPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const postIdString = params.postId;
  const postId = postIdString ? parseInt(postIdString, 10) : null;
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = !!currentUser;
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);
  const [loginAction, setLoginAction] = useState<string>("");
  const [reportModalOpened, setReportModalOpened] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("post");

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => (postId ? getPost(postId) : null),
    enabled: !!postId,
  });

  // Get all image URLs (use image_urls array or fall back to single image_url)
  const imageUrls =
    post?.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post?.image_url
        ? [post.image_url]
        : [];

  const isOwner = currentUser?.id === post?.user.id;
  const isBanned = post?.is_banned || post?.is_user_banned;

  const handleBuyClick = () => {
    if (isAuthenticated) {
      navigate({ to: `/app/checkout/${postId}` });
    } else {
      setLoginAction(t("view.purchaseAction"));
      openLoginModal();
    }
  };

  const handleLikeAuthRequired = () => {
    setLoginAction(tCommon("likes.likeAction"));
    openLoginModal();
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.alert}>
            <IconAlertCircle size={18} className={styles.alertIcon} />
            <span>{error instanceof Error ? error.message : t("view.failedToLoad")}</span>
          </div>
        </div>
      </div>
    );
  }

  const price = parseFloat(post.price);
  const shippingCost = parseFloat(post.shipping_cost || "0");

  // Show report menu for authenticated non-owners
  const showReportMenu = isAuthenticated && !isOwner;

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header with Back button and Menu */}
          <header className={styles.header}>
            <div className={styles.headerRow}>
              <button
                className={styles.backButton}
                onClick={() => navigate({ to: "/explore" })}
              >
                <IconArrowLeft size={16} />
                {t("view.backToExplore")}
              </button>

              {showReportMenu && (
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <button className={styles.menuButton}>
                      <IconDotsVertical size={20} />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      color="red"
                      leftSection={<IconFlag size={14} />}
                      onClick={() => {
                        setReportType("post");
                        setReportModalOpened(true);
                      }}
                    >
                      {t("view.reportListing")}
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconUserExclamation size={14} />}
                      onClick={() => {
                        setReportType("user");
                        setReportModalOpened(true);
                      }}
                    >
                      {t("view.reportUser")}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </div>
          </header>

          {/* Main layout */}
          <div className={styles.layout}>
            {/* Left: Sticky Image Carousel */}
            <div className={styles.imageColumn}>
              <PostImageCarousel imageUrls={imageUrls} alt={post.title} />
            </div>

            {/* Right: Details Card */}
            <div className={styles.detailsCard}>
              {/* Status badges */}
              {(isOwner || post.is_sold) && (
                <div className={styles.badges}>
                  {isOwner && (
                    <span className={`${styles.badge} ${styles.badgeOwner}`}>
                      {t("view.yourListing")}
                    </span>
                  )}
                  {post.is_sold && (
                    <span className={`${styles.badge} ${styles.badgeSold}`}>
                      {tCommon("badges.sold")}
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              <h1 className={styles.title}>{post.title}</h1>

              {/* Price and Like */}
              <div className={styles.priceRow}>
                <div className={styles.priceSection}>
                  <span className={styles.price}>฿{price.toLocaleString()}</span>
                  {shippingCost > 0 ? (
                    <span className={styles.shippingCost}>
                      + ฿{shippingCost.toLocaleString()} {t("view.shipping")}
                    </span>
                  ) : (
                    <span className={styles.freeShipping}>
                      {t("view.freeShipping")}
                    </span>
                  )}
                </div>
                <LikeButton
                  postId={post.id}
                  initialLiked={post.is_liked}
                  initialCount={post.like_count}
                  size="lg"
                  onAuthRequired={handleLikeAuthRequired}
                />
              </div>

              <hr className={styles.divider} />

              {/* Size */}
              {post.size && (
                <div>
                  <div className={styles.sectionLabel}>
                    {tCommon("postCard.size")}
                  </div>
                  <span className={styles.sizeBadge}>{post.size}</span>
                </div>
              )}

              {/* Description */}
              <div>
                <div className={styles.sectionLabel}>{t("view.description")}</div>
                <p className={styles.description}>{post.description}</p>
              </div>

              {/* Measurements Section */}
              {post.measurements && (
                <MeasurementsDisplay measurements={post.measurements} />
              )}

              <hr className={styles.divider} />

              {/* Seller Info */}
              {isOwner ? (
                <div className={styles.sellerCardStatic}>
                  <div className={styles.sellerInfo}>
                    <div className={styles.sellerAvatar}>
                      {post.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.sellerDetails}>
                      <div className={styles.sellerUsername}>
                        @{post.user.username}
                      </div>
                      <div className={styles.sellerName}>
                        {post.user.first_name} {post.user.last_name}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/profile/$username"
                  params={{ username: post.user.username }}
                  className={styles.sellerCard}
                >
                  <div className={styles.sellerInfo}>
                    <div className={styles.sellerAvatar}>
                      {post.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.sellerDetails}>
                      <div className={styles.sellerUsername}>
                        @{post.user.username}
                      </div>
                      <div className={styles.sellerName}>
                        {post.user.first_name} {post.user.last_name}
                      </div>
                    </div>
                  </div>
                  <IconChevronRight size={20} className={styles.sellerArrow} />
                </Link>
              )}

              {/* Ban Warning */}
              {isBanned && (
                <div className={styles.alert}>
                  <IconAlertCircle size={18} className={styles.alertIcon} />
                  <span>
                    {post.is_banned
                      ? t("view.listingRemoved")
                      : t("view.sellerSuspended")}
                  </span>
                </div>
              )}

              {/* Buy Button - hide for owners, show sold state */}
              {!isOwner && (
                post.is_sold ? (
                  <div className={styles.soldButton}>
                    {tCommon("badges.sold")}
                  </div>
                ) : (
                  <button
                    className={styles.buyButtonDesktop}
                    onClick={handleBuyClick}
                    disabled={isBanned}
                  >
                    <IconShoppingCart size={20} />
                    {t("view.buyNow")} - ฿{price.toLocaleString()}
                  </button>
                )
              )}

              {/* Earnings Preview - only show for owners */}
              {isOwner && (
                <EarningsPreview
                  postId={postId ?? undefined}
                  title={t("view.yourEarnings")}
                />
              )}

            </div>
          </div>
        </div>

        {/* Mobile Sticky Buy Bar - hide for owners and sold items */}
        {!isOwner && !post.is_sold && (
          <div className={styles.buyBar}>
            <button
              className={styles.buyBarButton}
              onClick={handleBuyClick}
              disabled={isBanned}
            >
              <IconShoppingCart size={20} />
              {t("view.buyNow")} - ฿{price.toLocaleString()}
            </button>
          </div>
        )}
      </div>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={loginAction}
      />

      {isAuthenticated && (
        <ReportModal
          opened={reportModalOpened}
          onClose={() => setReportModalOpened(false)}
          reportType={reportType}
          entityId={reportType === "post" ? post.id : post.user.id}
          entityName={
            reportType === "post" ? post.title : `@${post.user.username}`
          }
        />
      )}
    </>
  );
}
