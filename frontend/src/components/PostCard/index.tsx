/**
 * PostCard component for displaying post in a card format
 * Premium, modern design with subtle animations
 */

import { useState } from "react";
import { Card, Image, Text, Badge, Group, Stack, Box, Menu, ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { IconDotsVertical, IconFlag, IconUser } from "@tabler/icons-react";
import type { Post, PostType } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import { useAuthStore } from "@/stores/authStore";
import { ReportModal } from "@/components/ReportModal";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
}

const typeColors: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};

const typeLabels: Record<PostType, string> = {
  SHIRT: "Shirt",
  PANTS: "Pants",
  JACKET: "Jacket",
  SHOES: "Shoes",
  ACCESSORIES: "Accessories",
  OTHER: "Other",
};

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.user.id;

  const [reportOpened, { open: openReport, close: closeReport }] = useDisclosure(false);
  const [reportType, setReportType] = useState<ReportType>("post");

  const handleClick = () => {
    navigate({ to: "/app/posts/$postId", params: { postId: String(post.id) } });
  };

  const handleReportListing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReportType("post");
    openReport();
  };

  const handleReportUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReportType("user");
    openReport();
  };

  return (
    <>
      <Card
        className={styles.card}
        shadow="sm"
        padding={0}
        radius="lg"
        withBorder
        onClick={handleClick}
      >
        <Card.Section className={styles.imageSection}>
          <Image
            src={post.image_url || "https://placehold.co/400x400?text=No+Image"}
            height={220}
            alt={post.title}
            fallbackSrc="https://placehold.co/400x400?text=No+Image"
            className={post.is_sold ? styles.imageSold : styles.image}
          />
          <Badge
            className={styles.typeBadge}
            color={typeColors[post.type]}
            variant="filled"
            size="sm"
          >
            {typeLabels[post.type]}
          </Badge>
          {post.is_sold && (
            <Badge
              className={styles.soldBadge}
              color="red"
              variant="filled"
              size="lg"
            >
              Sold
            </Badge>
          )}
          {!isOwner && (
            <div className={styles.actionWrapper}>
              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="white"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDotsVertical size={14} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                  <Menu.Label>Report</Menu.Label>
                  <Menu.Item
                    leftSection={<IconFlag size={14} />}
                    color="red"
                    onClick={handleReportListing}
                  >
                    Report Listing
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconUser size={14} />}
                    color="red"
                    onClick={handleReportUser}
                  >
                    Report Seller
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

            <Group justify="space-between" align="center">
              <Text size="xl" fw={700} c="dark">
                ฿{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              {isOwner && (
                <Badge variant="light" color="gray" size="sm">
                  Your listing
                </Badge>
              )}
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
      </Card>

      <ReportModal
        opened={reportOpened}
        onClose={closeReport}
        reportType={reportType}
        targetId={reportType === "post" ? post.id : post.user.id}
        targetName={reportType === "post" ? post.title : `@${post.user.username}`}
      />
    </>
  );
}

