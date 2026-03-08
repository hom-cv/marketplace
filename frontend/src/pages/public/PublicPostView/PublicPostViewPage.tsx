/**
 * Post View Page - View a single post
 * Works for both authenticated and unauthenticated users
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconShoppingCart,
  IconArrowLeft,
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { PostImageCarousel } from "@/components/PostImageCarousel";
import { ReportModal } from "@/components/ReportModal";
import type { ReportType } from "@/api/types/admin";
import { PostDetails, SellerInfoCard, PostActions } from "./components";
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
      navigate({ to: `/checkout/${postId}` });
    } else {
      setLoginAction(t("view.purchaseAction"));
      openLoginModal();
    }
  };

  const handleLikeAuthRequired = () => {
    setLoginAction(tCommon("likes.likeAction"));
    openLoginModal();
  };

  const handleReportPost = () => {
    setReportType("post");
    setReportModalOpened(true);
  };

  const handleReportUser = () => {
    setReportType("user");
    setReportModalOpened(true);
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
          <Alert variant="error">
            {error instanceof Error ? error.message : t("view.failedToLoad")}
          </Alert>
        </div>
      </div>
    );
  }

  const price = parseFloat(post.price);
  const showReportMenu = isAuthenticated && !isOwner;

  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header with Back button and Menu */}
          <header className={styles.header}>
            <div className={styles.headerRow}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<IconArrowLeft size={16} />}
                onClick={() => navigate({ to: "/explore" })}
              >
                {t("view.backToExplore")}
              </Button>

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
                      onClick={handleReportPost}
                    >
                      {t("view.reportListing")}
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconUserExclamation size={14} />}
                      onClick={handleReportUser}
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
              <PostDetails
                post={post}
                isOwner={isOwner}
                onLikeAuthRequired={handleLikeAuthRequired}
              />

              <SellerInfoCard user={post.user} isOwner={isOwner} isBanned={post.is_user_banned} />

              <PostActions
                post={post}
                postId={postId}
                isOwner={isOwner}
                isBanned={!!isBanned}
                onBuyClick={handleBuyClick}
              />
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
