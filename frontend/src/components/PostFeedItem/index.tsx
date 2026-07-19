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
const SWIPE_THRESHOLD = 50; // px of horizontal travel to change slide
const TAP_SLOP = 10; // movement under this still counts as a tap, not a swipe

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

  const images =
    post.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];
  const hasMultiple = images.length > 1;

  // Swipeable carousel state.
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // px, live finger travel
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);

  // Image tap: distinguish single (open post) from double (like). Wait one
  // double-tap window before navigating so a second tap can cancel it.
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(tapTimerRef.current), []);

  const handleTouchStart = (e: React.TouchEvent) => {
    suppressClickRef.current = false; // clear any stale flag from a prior gesture
    if (!hasMultiple) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dxRef.current = 0;
    movedRef.current = false;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    let dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    if (!movedRef.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > TAP_SLOP) {
      setDragging(false);
      setDragOffset(0);
      return;
    }
    if (Math.abs(dx) > TAP_SLOP) movedRef.current = true;

    if ((index === 0 && dx > 0) || (index === images.length - 1 && dx < 0)) {
      dx *= 0.3;
    }
    dxRef.current = dx;
    setDragOffset(dx);
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    const dx = dxRef.current;
    if (dx <= -SWIPE_THRESHOLD && index < images.length - 1) setIndex(index + 1);
    else if (dx >= SWIPE_THRESHOLD && index > 0) setIndex(index - 1);
    if (movedRef.current) suppressClickRef.current = true; // don't tap after a swipe
    setDragging(false);
    setDragOffset(0);
  };

  const openPost = () => {
    clearTimeout(tapTimerRef.current);
    navigate({ to: `${linkPrefix}/$postId`, params: { postId: String(post.id) } });
  };

  const openReport = (type: ReportType) => {
    setReportType(type);
    setReportModalOpened(true);
  };

  const handleImageTap = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
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

      {/* Full-bleed swipeable image carousel with double-tap-to-like */}
      <Box
        className={styles.imageWrap}
        onClick={handleImageTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {images.length > 0 ? (
          <div
            ref={trackRef}
            className={`${styles.track} ${dragging ? styles.dragging : ""}`}
            style={{ transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))` }}
          >
            {images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${post.title} ${i + 1}`}
                loading="lazy"
                draggable={false}
                className={styles.image}
              />
            ))}
          </div>
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
        {hasMultiple && (
          <div className={styles.dots}>
            {images.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              />
            ))}
          </div>
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
