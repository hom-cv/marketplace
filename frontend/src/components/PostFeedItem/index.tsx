/**
 * PostFeedItem component - Instagram-style feed post for mobile.
 * Username header (with report menu), full-bleed portrait image with
 * double-tap-to-like, then a footer: title + price on the left, like on the right.
 */

import { useRef, useState, useEffect } from "react";
import { Box, Text, Badge, Stack, Avatar, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconHeart,
  IconHeartFilled,
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import type { Post } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import { useAuthStore, useIsAuthenticated } from "@/stores/authStore";
import { useLike } from "@/hooks/useLike";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { ReportModal } from "@/components/ReportModal";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import styles from "./PostFeedItem.module.css";

interface PostFeedItemProps {
  post: Post;
  /** Base path for navigation (default: "/explore") */
  linkPrefix?: string;
}

const DOUBLE_TAP_MS = 300;

export function PostFeedItem({ post, linkPrefix = "/explore" }: PostFeedItemProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useIsAuthenticated();
  const isOwner = currentUser?.id === post.user?.id;
  const { t } = useTranslation("common");
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);
  const [reportModalOpened, setReportModalOpened] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("post");
  const { isLiked, likeCount, toggle, like } = useLike(
    post.id,
    post.is_liked,
    post.like_count,
  );

  const [heartPopKey, setHeartPopKey] = useState(0);

  const showReportMenu = isAuthenticated && !isOwner;

  // Image tap: distinguish single (open post) from double (like). Wait one
  // double-tap window before navigating so a second tap can cancel it.
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(tapTimerRef.current), []);

  const openPost = () => {
    clearTimeout(tapTimerRef.current);
    navigate({ to: `${linkPrefix}/$postId`, params: { postId: String(post.id) } });
  };

  const openReport = (type: ReportType) => {
    setReportType(type);
    setReportModalOpened(true);
  };

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      clearTimeout(tapTimerRef.current);
      lastTapRef.current = 0;
      if (!isAuthenticated) {
        openLoginModal();
        return;
      }
      like();
      setHeartPopKey((prev) => prev + 1);
      return;
    }
    lastTapRef.current = now;
    tapTimerRef.current = setTimeout(openPost, DOUBLE_TAP_MS);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    toggle();
  };

  return (
    <Box className={styles.container}>
      {/* Header: avatar + username, report menu on the right */}
      <Box className={styles.header}>
        <Box className={styles.headerUser} onClick={openPost}>
          <Avatar color="blue" radius="xl" size="sm">
            {post.user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Text fw={600} size="sm" className={styles.username}>
            @{post.user.username}
          </Text>
        </Box>
        {showReportMenu && (
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <button type="button" className={styles.menuButton}>
                <IconDotsVertical size={20} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconFlag size={14} />}
                onClick={() => openReport("post")}
              >
                {t("postCard.reportListing")}
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconUserExclamation size={14} />}
                onClick={() => openReport("user")}
              >
                {t("postCard.reportUser")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Box>

      {/* Full-bleed image with double-tap-to-like */}
      <Box className={styles.imageWrap} onClick={handleImageTap}>
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
            loading="lazy"
            className={styles.image}
          />
        ) : (
          <ImagePlaceholder iconSize={64} />
        )}
        {post.is_sold && (
          <Badge color="red" variant="filled" className={styles.soldOverlay}>
            {t("badges.sold")}
          </Badge>
        )}
        {isOwner && (
          <Badge variant="filled" color="gray" className={styles.ownerOverlay}>
            {t("badges.yourListing")}
          </Badge>
        )}
        {heartPopKey > 0 && (
          <IconHeartFilled
            key={heartPopKey}
            size={96}
            className={styles.heartPop}
          />
        )}
      </Box>

      {/* Footer: title + price on the left, large like on the right */}
      <Box className={styles.footer}>
        <Stack gap={2} className={styles.footerInfo} onClick={openPost}>
          {post.brand && (
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" lineClamp={1}>
              {post.brand.name}
            </Text>
          )}
          <Text fw={600} size="sm" lineClamp={1}>
            {post.title}
          </Text>
          <Text fw={700} size="md">
            ฿
            {price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </Stack>
        <button
          type="button"
          className={[styles.likeButton, isLiked && styles.liked]
            .filter(Boolean)
            .join(" ")}
          onClick={handleLikeClick}
        >
          {isLiked ? <IconHeartFilled size={26} /> : <IconHeart size={26} />}
          <span className={styles.likeCount}>{likeCount}</span>
        </button>
      </Box>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={t("likes.likeAction")}
      />

      {isAuthenticated && (
        <ReportModal
          opened={reportModalOpened}
          onClose={() => setReportModalOpened(false)}
          reportType={reportType}
          entityId={reportType === "post" ? post.id : post.user.id}
          entityName={reportType === "post" ? post.title : `@${post.user.username}`}
        />
      )}
    </Box>
  );
}
