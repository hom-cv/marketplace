/**
 * PostCard component - Clean, minimal design
 */

import { useMemo } from "react";
import {
  Card,
  Image,
  Text,
  Badge,
  Group,
  Box,
  Menu,
  ActionIcon,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import {
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
  IconHeart,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Post, PostType } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import { useAuthStore } from "@/stores/authStore";
import { LikeButton } from "@/components/LikeButton";
import styles from "./PostCard.module.css";

export interface ReportTarget {
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

interface PostCardProps {
  post: Post;
  onReportClick?: (target: ReportTarget) => void;
  showLikeButton?: boolean;
  linkTo?: "public" | "app";
}

export function PostCard({ post, onReportClick, showLikeButton = true, linkTo = "app" }: PostCardProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.user.id;
  const { t } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");

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
    if (linkTo === "public") {
      navigate({ to: "/posts/$postId", params: { postId: String(post.id) } });
    } else {
      navigate({ to: "/app/posts/$postId", params: { postId: String(post.id) } });
    }
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

  const formattedPrice = price.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <Card
      className={styles.card}
      padding={0}
      radius="md"
      onClick={handleClick}
    >
      <Card.Section className={styles.imageSection}>
        <Image
          src={post.image_url || "https://placehold.co/400x400?text=No+Image"}
          alt={post.title}
          fallbackSrc="https://placehold.co/400x400?text=No+Image"
          className={post.is_sold ? styles.imageSold : styles.image}
        />

        {/* Status badges */}
        {post.is_sold && (
          <Badge className={styles.statusBadge} color="dark" size="sm">
            {t("badges.sold")}
          </Badge>
        )}
        {post.is_banned && (
          <Badge className={styles.statusBadge} color="red" size="sm">
            {t("badges.removed")}
          </Badge>
        )}

        {/* Like button/count overlay */}
        <div className={styles.likeWrapper}>
          {showLikeButton ? (
            <LikeButton
              postId={post.id}
              initialLiked={post.is_liked}
              initialCount={post.like_count}
              size="sm"
            />
          ) : (
            <Group gap={4} className={styles.likeCount}>
              <IconHeart size={16} />
              <Text size="xs" c="dimmed">{post.like_count}</Text>
            </Group>
          )}
        </div>

        {/* Report Menu */}
        {!isOwner && onReportClick && (
          <div className={styles.menuWrapper}>
            <Menu shadow="sm" width={160} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  className={styles.menuButton}
                  variant="white"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item
                  leftSection={<IconFlag size={14} />}
                  onClick={handleReportListing}
                >
                  {t("postCard.reportListing")}
                </Menu.Item>
                <Menu.Item
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

      <Box className={styles.content}>
        <div className={styles.meta}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
            {typeLabels[post.type]}
            {post.size && post.type !== "ACCESSORIES" && ` · ${post.size}`}
          </Text>
          {isOwner && (
            <Badge variant="light" color="gray" size="xs">
              {t("badges.yourListing")}
            </Badge>
          )}
        </div>

        <Text className={styles.title} lineClamp={1}>
          {post.title}
        </Text>

        <Group justify="space-between" align="center" mt={4}>
          <Text className={styles.price}>฿{formattedPrice}</Text>
          <Text size="xs" c="dimmed">@{post.user.username}</Text>
        </Group>
      </Box>
    </Card>
  );
}
