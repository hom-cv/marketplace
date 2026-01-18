/**
 * PostCard component for displaying post in a card format
 * Premium, modern design with subtle animations
 */

import { useMemo } from "react";
import {
  Card,
  Image,
  Text,
  Badge,
  Group,
  Stack,
  Box,
  Menu,
  ActionIcon,
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
          <Image
            src={post.image_url}
            height={220}
            alt={post.title}
            className={post.is_sold ? styles.imageSold : styles.image}
          />
        ) : (
          <Box h={220} className={styles.imagePlaceholder}>
            <ImagePlaceholder iconSize={48} showText={false} />
          </Box>
        )}
        {/* Top-left badges: Category + Owner indicator */}
        <Group gap={4} className={styles.topBadges}>
          <Badge color={typeColors[post.type]} variant="filled" size="sm">
            {typeLabels[post.type]}
          </Badge>
          {isOwner && (
            <Badge variant="filled" color="gray" size="sm">
              {t("badges.yourListing")}
            </Badge>
          )}
        </Group>
        {post.is_sold && (
          <Badge
            className={styles.soldBadge}
            color="red"
            variant="filled"
            size="lg"
          >
            {t("badges.sold")}
          </Badge>
        )}
        {post.is_banned && (
          <Badge
            className={styles.soldBadge}
            color="dark"
            variant="filled"
            size="lg"
          >
            {t("badges.removed")}
          </Badge>
        )}

        {/* Report Menu - only show for non-owners when handler is provided */}
        {!isOwner && onReportClick && (
          <div className={styles.menuWrapper}>
            <Menu shadow="md" width={180} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  className={styles.menuButton}
                  variant="white"
                  color="gray"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={16} />
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

      <Box p="md">
        <Stack gap={6}>
          <Text fw={600} size="md" lineClamp={1}>
            {post.title}
          </Text>

          {/* Size display */}
          {post.size && (
            <Text size="sm" c="dimmed">
              {t("postCard.size")}: {post.size}
            </Text>
          )}

          <Group justify="space-between" align="center">
            <Text size="xl" fw={700} c="dark">
              ฿
              {price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <LikeButton
              postId={post.id}
              initialLiked={post.is_liked}
              initialCount={post.like_count}
              size="sm"
              onAuthRequired={openLoginModal}
            />
          </Group>

          <Text size="sm" c="dimmed" lineClamp={2}>
            {post.description}
          </Text>

          <Group gap={4} mt={4}>
            <Text size="xs" c="dimmed">
              @{post.user.username}
            </Text>
          </Group>
        </Stack>
      </Box>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={t("likes.likeAction")}
      />
    </Card>
  );
}
