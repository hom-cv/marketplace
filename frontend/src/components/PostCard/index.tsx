/**
 * PostCard component for displaying post in a card format
 * Premium, modern design with subtle animations
 */

import { Card, Image, Text, Badge, Group, Stack, Box } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import type { Post, PostType } from "@/api/types/post";
import { useAuthStore } from "@/stores/authStore";
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

  const handleClick = () => {
    navigate({ to: "/app/posts/$postId", params: { postId: String(post.id) } });
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
        <Image
          src={post.image_url || "https://placehold.co/400x400?text=No+Image"}
          height={220}
          alt={post.title}
          fallbackSrc="https://placehold.co/400x400?text=No+Image"
          className={styles.image}
        />
        <Badge
          className={styles.typeBadge}
          color={typeColors[post.type]}
          variant="filled"
          size="sm"
        >
          {typeLabels[post.type]}
        </Badge>
      </Card.Section>

      <Box p="md">
        <Stack gap={6}>
          <Text fw={600} size="md" lineClamp={1}>
            {post.title}
          </Text>

          <Group justify="space-between" align="center">
            <Text size="xl" fw={700} c="dark">
              ฿{price.toLocaleString()}
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
  );
}
