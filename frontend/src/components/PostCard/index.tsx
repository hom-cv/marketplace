import { Image, Badge, Box, Menu, ActionIcon, Text, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import {
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Post } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import { useAuthStore } from "@/stores/authStore";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { Username } from "@/components/Username";
import styles from "./PostCard.module.css";

export interface ReportTarget {
  reportType: ReportType;
  entityId: number;
  entityName: string;
}

interface PostCardProps {
  post: Post;
  onReportClick?: (target: ReportTarget) => void;
  linkPrefix?: string;
}

export function PostCard({
  post,
  onReportClick,
  linkPrefix = "/explore",
}: PostCardProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.user.id;
  const { t } = useTranslation("common");
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);

  const handleClick = () => {
    navigate({
      to: `${linkPrefix}/$postId`,
      params: { postId: String(post.id) },
    });
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
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.imageWrap}>
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.title}
            className={post.is_sold ? styles.imageSold : styles.image}
          />
        ) : (
          <Box className={styles.placeholder}>
            <ImagePlaceholder iconSize={40} showText={false} />
          </Box>
        )}

        {post.is_sold && (
          <Badge className={styles.status} color="red" size="sm">
            {t("badges.sold")}
          </Badge>
        )}

        {post.is_banned && (
          <Badge className={styles.status} color="dark" size="sm">
            {t("badges.removed")}
          </Badge>
        )}

        {!isOwner && onReportClick && (
          <Menu shadow="sm" width={160} position="bottom-end">
            <Menu.Target>
              <ActionIcon
                className={styles.menu}
                variant="white"
                size="xs"
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
        )}
      </div>

      <Box className={styles.info}>
        <Group className={styles.titleRow} justify="space-between" gap="xs" wrap="nowrap">
          <Text size="sm" c="var(--color-text)" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
            {post.title}
          </Text>
          {post.size && (
            <Text size="sm" fw={600} c="var(--color-text)">
              {post.size === "ONE_SIZE" ? "OS" : post.size}
            </Text>
          )}
        </Group>
        <Text size="md" fw={600} c="var(--color-text)" mb={8}>
          ฿{price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </Text>
        <Group justify="space-between" align="center">
          <Username username={post.user.username} isBanned={post.is_user_banned} className={styles.username} />
          <LikeButton
            key={`${post.id}-${post.is_liked}-${post.like_count}`}
            postId={post.id}
            initialLiked={post.is_liked}
            initialCount={post.like_count}
            size="sm"
            onAuthRequired={openLoginModal}
          />
        </Group>
      </Box>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={t("likes.likeAction")}
      />
    </div>
  );
}
