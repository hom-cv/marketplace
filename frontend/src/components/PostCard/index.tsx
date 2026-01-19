/**
 * PostCard component - Soft & Airy design
 * Features: 4:5 aspect ratio, floating like button, hover lift animation
 */

import { useMemo } from "react";
import {
  Card,
  Text,
  Badge,
  Box,
  Menu,
  ActionIcon,
  Group,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import {
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Post, PostType } from "@/api/types/post";
import { formatSizeDisplay } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import { useAuthStore } from "@/stores/authStore";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import styles from "./PostCard.module.css";

export interface ReportTarget {
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

interface PostCardProps {
  post: Post;
  onReportClick?: (target: ReportTarget) => void;
  /** Base path for navigation (default: "/app/posts") */
  linkPrefix?: string;
}

const typeColors: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};

export function PostCard({ post, onReportClick, linkPrefix = "/app/posts" }: PostCardProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.user.id;
  const { t } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);

  // Type labels with translations
  const typeLabels: Record<PostType, string> = useMemo(
    () => ({
      SHIRT: tListings("categories.shirt"),
      PANTS: tListings("categories.pants"),
      JACKET: tListings("categories.jacket"),
      SHOES: tListings("categories.shoes"),
      ACCESSORIES: tListings("categories.accessories"),
      OTHER: tListings("categories.other"),
    }),
    [tListings],
  );

  const handleClick = () => {
    navigate({ to: `${linkPrefix}/$postId`, params: { postId: String(post.id) } });
  };

  const handleReportListing = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReportClick?.({
      reportType: "post",
      entityId: post.id,
      entityName: post.title,
    });
  };

  const handleReportUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReportClick?.({
      reportType: "user",
      entityId: post.user.id,
      entityName: `@${post.user.username}`,
    });
  };

  return (
    <Card
      className={styles.card}
      shadow="sm"
      padding={0}
      radius="lg"
      withBorder
      onClick={handleClick}
    >
      <Card.Section className={styles.imageSection}>
        {post.image_url ? (
          <div className={styles.imageWrapper}>
            <img
              src={post.image_url}
              alt={post.title}
              className={post.is_sold ? styles.imageSold : styles.image}
            />
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <ImagePlaceholder iconSize={40} showText={false} />
          </div>
        )}

        {/* Status Badges - Center */}
        {post.is_sold && (
          <Badge className={styles.statusBadge} color="red" variant="filled" size="md" radius="md">
            {t("badges.sold")}
          </Badge>
        )}
        {post.is_banned && (
          <Badge className={styles.statusBadge} color="dark" variant="filled" size="md" radius="md">
            {t("badges.removed")}
          </Badge>
        )}

        {/* Owner Badge - Bottom left */}
        {isOwner && (
          <Badge className={styles.ownerBadge} variant="filled" color="gray" size="xs" radius="md">
            {t("badges.yourListing")}
          </Badge>
        )}

        {/* Report Menu - Top right (only for non-owners) */}
        {!isOwner && onReportClick && (
          <div className={styles.menuWrapper}>
            <Menu shadow="md" width={180} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  className={styles.menuButton}
                  variant="white"
                  color="gray"
                  size="sm"
                  radius="xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item
                  color="red"
                  leftSection={<IconFlag size={14} />}
                  onClick={handleReportListing}
                >
                  {t("postCard.reportListing")}
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconUserExclamation size={14} />}
                  onClick={handleReportUser}
                >
                  {t("postCard.reportUser")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        )}
      </Card.Section>

      {/* Content Section */}
      <Box className={styles.content}>
        {/* Title - What is this item? */}
        <Text fw={500} lineClamp={1} className={styles.title}>
          {post.title}
        </Text>

        {/* Price + Like - Key decision row */}
        <Group justify="space-between" align="center" className={styles.priceRow}>
          <Text fw={700} className={styles.price}>
            ฿{price.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </Text>
          <LikeButton
            postId={post.id}
            initialLiked={post.is_liked}
            initialCount={post.like_count}
            size="md"
            onAuthRequired={openLoginModal}
          />
        </Group>

        {/* Type + Size - Category and fit info */}
        <Group gap={8} align="center" className={styles.metaRow}>
          <Badge color={typeColors[post.type]} variant="light" size="sm" radius="sm" className={styles.typeBadge}>
            {typeLabels[post.type]}
          </Badge>
          {post.size && (
            <>
              <Text c="dimmed" className={styles.separator}>·</Text>
              <Text c="dimmed" fw={500} className={styles.sizeText}>
                {formatSizeDisplay(post.size, post.type)}
              </Text>
            </>
          )}
        </Group>
      </Box>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={t("likes.likeAction")}
      />
    </Card>
  );
}
