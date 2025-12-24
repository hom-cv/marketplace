/**
 * PostCard component for displaying post in a card format
 * Clean, minimal design with subtle animations
 */

import { Card, Image, Text, Badge, Stack, Box, Overlay } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import type { Post } from "@/api/types/post";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);

  const handleClick = () => {
    navigate({ to: "/app/posts/$postId", params: { postId: String(post.id) } });
  };

  return (
    <Card
      className={`${styles.card} ${post.is_sold ? styles.soldCard : ""}`}
      shadow="sm"
      padding={0}
      radius="md"
      withBorder
      onClick={handleClick}
    >
      <Card.Section className={styles.imageSection}>
        <Image
          src={post.image_url || "https://placehold.co/400x400?text=No+Image"}
          height={200}
          alt={post.title}
          fallbackSrc="https://placehold.co/400x400?text=No+Image"
          className={styles.image}
        />
        {post.is_sold && (
          <>
            <Overlay color="#000" backgroundOpacity={0.45} className={styles.soldOverlay} />
            <Badge
              className={styles.soldBadge}
              color="red"
              variant="filled"
              size="md"
            >
              SOLD
            </Badge>
          </>
        )}
      </Card.Section>

      <Box p="sm">
        <Stack gap={4}>
          <Text fw={600} size="sm" lineClamp={1}>
            {post.title}
          </Text>

          <Text
            size="lg"
            fw={700}
            c={post.is_sold ? "dimmed" : "dark"}
            td={post.is_sold ? "line-through" : undefined}
          >
            ฿{price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>

          <Text size="xs" c="dimmed">
            @{post.user.username}
          </Text>
        </Stack>
      </Box>
    </Card>
  );
}
