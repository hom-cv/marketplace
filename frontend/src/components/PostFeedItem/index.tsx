/**
 * PostFeedItem component - Instagram-style feed item for mobile
 * Clean, minimal design with full-width image
 */

import { Box, Group, Text, Badge, Stack, Image, Overlay } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import type { Post } from "@/api/types/post";

interface PostFeedItemProps {
  post: Post;
}

export function PostFeedItem({ post }: PostFeedItemProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);

  const handleClick = () => {
    navigate({ to: "/app/posts/$postId", params: { postId: String(post.id) } });
  };

  return (
    <Box
      mb="md"
      onClick={handleClick}
      style={{
        cursor: "pointer",
        opacity: post.is_sold ? 0.9 : 1,
      }}
    >
      {/* Full-width Image with Sold Overlay */}
      <Box pos="relative">
        <Image
          src={post.image_url || "https://placehold.co/600x600?text=No+Image"}
          alt={post.title}
          fallbackSrc="https://placehold.co/600x600?text=No+Image"
          h={350}
          fit="cover"
        />
        {post.is_sold && (
          <>
            <Overlay color="#000" backgroundOpacity={0.45} />
            <Badge
              color="red"
              variant="filled"
              size="lg"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textTransform: "uppercase",
                fontSize: "14px",
                letterSpacing: "1px",
                zIndex: 10,
              }}
            >
              SOLD
            </Badge>
          </>
        )}
      </Box>

      {/* Content below image */}
      <Stack gap={4} px="md" py="sm">
        <Group justify="space-between" align="center">
          <Text
            fw={700}
            size="lg"
            c={post.is_sold ? "dimmed" : undefined}
            td={post.is_sold ? "line-through" : undefined}
          >
            ฿{price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <Text size="xs" c="dimmed">
            @{post.user.username}
          </Text>
        </Group>

        <Text fw={500} size="sm" lineClamp={1}>
          {post.title}
        </Text>
      </Stack>
    </Box>
  );
}
