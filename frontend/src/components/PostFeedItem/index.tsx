/**
 * PostFeedItem component - Instagram-style feed item for mobile
 * Full-width image with user info and details below
 */

import { Box, Group, Text, Badge, Stack, Image } from "@mantine/core";
import type { Post, PostType } from "@/api/types";

interface PostFeedItemProps {
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

export function PostFeedItem({ post }: PostFeedItemProps) {
  const price = parseFloat(post.price);

  return (
    <Box mb="lg">
      {/* Full-width Image */}
      <Image
        src={post.image_url || "https://placehold.co/600x600?text=No+Image"}
        alt={post.title}
        fallbackSrc="https://placehold.co/600x600?text=No+Image"
        h={400}
        fit="cover"
      />

      {/* Content below image */}
      <Stack gap="xs" px="md" py="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">
            ${price.toFixed(2)}
          </Text>
          <Badge color={typeColors[post.type]} variant="light">
            {typeLabels[post.type]}
          </Badge>
        </Group>

        <Text fw={500} lineClamp={1}>
          {post.title}
        </Text>

        <Text size="sm" c="dimmed" lineClamp={2}>
          {post.description}
        </Text>
      </Stack>
    </Box>
  );
}
