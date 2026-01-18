/**
 * PublicPostViewPage - View a single post without authentication
 * Shows post details with CTA to sign up/login to purchase
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
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
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconPhoto,
  IconArrowRight,
  IconHeart,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPost } from "@/api/posts";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import type { PostType } from "@/api/types/post";
import styles from "./PublicPostViewPage.module.css";

const typeColors: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};

export function PublicPostViewPage() {
  const navigate = useNavigate();
  const { postId: postIdString } = useParams({
    from: "/posts/$postId",
  });
  const postId = postIdString ? parseInt(postIdString, 10) : null;
  const { t } = useTranslation("listings");
  const { t: tNav } = useTranslation("navigation");

  const typeLabels: Record<PostType, string> = useMemo(
    () => ({
      SHIRT: t("categories.shirt"),
      PANTS: t("categories.pants"),
      JACKET: t("categories.jacket"),
      SHOES: t("categories.shoes"),
      ACCESSORIES: t("categories.accessories"),
      OTHER: t("categories.other"),
    }),
    [t],
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => (postId ? getPost(postId) : null),
    enabled: !!postId,
  });

  const imageUrls =
    post?.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post?.image_url
        ? [post.image_url]
        : [];

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
          {error instanceof Error ? error.message : t("view.failedToLoad")}
        </Alert>
      </Container>
    );
  }

  const price = parseFloat(post.price);

  return (
    <Container size="lg" py="xl">
      {/* Header with Back button */}
      <Group justify="space-between" mb="lg">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate({ to: "/explore" })}
        >
          {t("view.backToExplore")}
        </Button>
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
                  <IconPhoto
                    size={64}
                    stroke={1}
                    color="var(--mantine-color-gray-4)"
                  />
                  <Text c="dimmed" size="sm" mt="md">
                    {t("images.noImagesAvailable")}
                  </Text>
                </Box>
              )}
            </Box>

            {/* Thumbnail Carousel */}
            {imageUrls.length > 1 && (
              <Group
                gap="xs"
                mt="md"
                wrap="nowrap"
                className={styles.thumbnailRow}
              >
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
              {post.size && (
                <Badge color="gray" size="lg" variant="light">
                  {post.size}
                </Badge>
              )}
            </Group>

            {/* Title */}
            <Title order={1}>{post.title}</Title>

            {/* Price and Likes */}
            <Group justify="space-between" align="center">
              <Text size="2rem" fw={700} c="dark">
                ฿{price.toLocaleString()}
              </Text>
              <Group gap="xs">
                <IconHeart size={20} color="var(--mantine-color-dimmed)" />
                <Text c="dimmed">{post.like_count}</Text>
              </Group>
            </Group>

            <Divider />

            {/* Description */}
            <div>
              <Text size="sm" fw={500} c="dimmed" mb="xs">
                {t("view.description")}
              </Text>
              <Text style={{ whiteSpace: "pre-wrap" }}>
                {post.description}
              </Text>
            </div>

            {/* Measurements Section */}
            {post.measurements && (
              <MeasurementsDisplay measurements={post.measurements} />
            )}

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
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
              >
                {post.is_banned
                  ? t("view.listingRemoved")
                  : t("view.sellerSuspended")}
              </Alert>
            )}

            {/* Sign Up CTA */}
            {!isBanned && (
              <Paper className={styles.ctaCard} p="lg" radius="md">
                <Text fw={500} mb="md" ta="center">
                  {t("view.signUpToBuy")}
                </Text>
                <Stack gap="sm">
                  <Button
                    component={Link}
                    to="/sign-up"
                    size="lg"
                    rightSection={<IconArrowRight size={18} />}
                  >
                    {tNav("header.signUp")}
                  </Button>
                  <Button
                    component={Link}
                    to="/login"
                    variant="default"
                    size="lg"
                  >
                    {tNav("header.login")}
                  </Button>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
