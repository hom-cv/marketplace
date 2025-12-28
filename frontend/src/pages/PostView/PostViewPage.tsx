/**
 * Post View Page - View a single post with image carousel and buy button
 * Similar layout to CreatePost page but for viewing/purchasing
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Alert,
  Grid,
  Box,
  Image,
  Group,
  Badge,
  Paper,
  Loader,
  Center,
  Divider,
  Avatar,
  Menu,
  ActionIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconShoppingCart,
  IconArrowLeft,
  IconPhoto,
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import { getPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { EarningsPreview } from "@/components/EarningsPreview";
import { ReportModal } from "@/components/ReportModal";
import type { PostType } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import styles from "./PostViewPage.module.css";

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

export function PostViewPage() {
  const navigate = useNavigate();
  const { postId: postIdString } = useParams({ from: "/protected/app/posts/$postId" });
  const postId = postIdString ? parseInt(postIdString, 10) : null;
  const currentUser = useAuthStore((state) => state.user);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reportModalOpened, setReportModalOpened] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("post");

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => (postId ? getPost(postId) : null),
    enabled: !!postId,
  });

  // Get all image URLs (use image_urls array or fall back to single image_url)
  const imageUrls = post?.image_urls && post.image_urls.length > 0
    ? post.image_urls
    : post?.image_url
      ? [post.image_url]
      : [];

  const isOwner = currentUser?.id === post?.user.id;
  const isBanned = post?.is_banned || post?.is_user_banned;

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !post) {
    return (
      <Container size="lg" my={40}>
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error instanceof Error ? error.message : "Failed to load post"}
        </Alert>
      </Container>
    );
  }

  const price = parseFloat(post.price);

  return (
    <>
      <Container size="lg">
        {/* Header with Back button and Menu */}
        <Group justify="space-between" mb="lg">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate({ to: "/app/explore" })}
          >
            Back to Explore
          </Button>

          {!isOwner && (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg">
                  <IconDotsVertical size={20} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconFlag size={14} />}
                  onClick={() => {
                    setReportType("post");
                    setReportModalOpened(true);
                  }}
                >
                  Report Listing
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconUserExclamation size={14} />}
                  onClick={() => {
                    setReportType("user");
                    setReportModalOpened(true);
                  }}
                >
                  Report User
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        <Grid gutter="xl">
          {/* Left: Image Gallery */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Box className={styles.imageSection}>
              {/* Main Image Display */}
              <Box className={styles.mainImageWrapper}>
                {imageUrls.length > 0 ? (
                  <Image
                    src={imageUrls[selectedImageIndex]}
                    alt={post.title}
                    className={styles.mainImage}
                    fit="contain"
                    radius="md"
                  />
                ) : (
                  <Box className={styles.imagePlaceholder}>
                    <IconPhoto size={64} stroke={1} color="var(--mantine-color-gray-4)" />
                    <Text c="dimmed" size="sm" mt="md">
                      No images available
                    </Text>
                  </Box>
                )}
              </Box>

              {/* Thumbnail Carousel */}
              {imageUrls.length > 1 && (
                <Group gap="xs" mt="md" wrap="nowrap" className={styles.thumbnailRow}>
                  {imageUrls.map((url, index) => (
                    <Box
                      key={index}
                      className={`${styles.thumbnail} ${index === selectedImageIndex ? styles.thumbnailActive : ""}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <Image
                        src={url}
                        alt={`Image ${index + 1}`}
                        fit="cover"
                        radius="sm"
                      />
                    </Box>
                  ))}
                </Group>
              )}
            </Box>
          </Grid.Col>

          {/* Right: Details */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              {/* Category badge */}
              <Group>
                <Badge color={typeColors[post.type]} size="lg" variant="light">
                  {typeLabels[post.type]}
                </Badge>
                {isOwner && (
                  <Badge color="gray" size="lg" variant="light">
                    Your Listing
                  </Badge>
                )}
              </Group>

              {/* Title */}
              <Title order={1}>{post.title}</Title>

              {/* Price */}
              <Text size="2rem" fw={700} c="dark">
                ฿{price.toLocaleString()}
              </Text>

              <Divider />

              {/* Description */}
              <div>
                <Text size="sm" fw={500} c="dimmed" mb="xs">
                  Description
                </Text>
                <Text style={{ whiteSpace: "pre-wrap" }}>
                  {post.description}
                </Text>
              </div>

              <Divider />

              {/* Seller Info */}
              <Paper p="md" radius="md" withBorder>
                <Group>
                  <Avatar size="lg" radius="xl" color="blue">
                    {post.user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text fw={500}>@{post.user.username}</Text>
                    <Text size="sm" c="dimmed">
                      {post.user.first_name} {post.user.last_name}
                    </Text>
                  </div>
                </Group>
              </Paper>

              {/* Ban Warning */}
              {isBanned && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                  {post.is_banned
                    ? "This listing has been removed due to a policy violation."
                    : "This seller's account has been suspended."}
                </Alert>
              )}

              {/* Buy Button */}
              {!isOwner && (
                <Button
                  size="xl"
                  leftSection={<IconShoppingCart size={20} />}
                  onClick={() => navigate({ to: `/app/checkout/${postId}` })}
                  mt="md"
                  disabled={isBanned}
                >
                  Buy Now - ฿{price.toLocaleString()}
                </Button>
              )}

              {isOwner && (
                <EarningsPreview
                  postId={postId ?? undefined}
                  title="Your Earnings (if sold)"
                />
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
      <ReportModal
        opened={reportModalOpened}
        onClose={() => setReportModalOpened(false)}
        reportType={reportType}
        entityId={reportType === "post" ? (post?.id ?? 0) : (post?.user.id ?? 0)}
        entityName={reportType === "post" ? (post?.title ?? "") : `@${post?.user.username}`}
      />
    </>
  );
}
