/**
 * Public Post View Page - View a single post without authentication
 * Shows login prompt for actions like Buy and Like
 */

import { useState, useMemo } from "react";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconShoppingCart,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPost } from "@/api/posts";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
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
  const params = useParams({ strict: false });
  const postIdString = params.postId;
  const postId = postIdString ? parseInt(postIdString, 10) : null;
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  // Type labels with translations
  const typeLabels: Record<PostType, string> = useMemo(
    () => ({
      SHIRT: t("categories.shirt"),
      PANTS: t("categories.pants"),
      JACKET: t("categories.jacket"),
      SHOES: t("categories.shoes"),
      ACCESSORIES: t("categories.accessories"),
      OTHER: t("categories.other"),
    }),
    [t]
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);
  const [loginAction, setLoginAction] = useState<string>("");

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
  const imageUrls =
    post?.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post?.image_url
        ? [post.image_url]
        : [];

  const isBanned = post?.is_banned || post?.is_user_banned;

  const handleBuyClick = () => {
    setLoginAction(t("view.purchaseAction"));
    openLoginModal();
  };

  const handleLikeAuthRequired = () => {
    setLoginAction(tCommon("likes.likeAction"));
    openLoginModal();
  };

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
    <>
      <Container size="lg" py="lg">
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
                  <ImagePlaceholder />
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
                {post.is_sold && (
                  <Badge color="red" size="lg" variant="filled">
                    {tCommon("badges.sold")}
                  </Badge>
                )}
              </Group>

              {/* Title */}
              <Title order={1}>{post.title}</Title>

              {/* Price and Like */}
              <Group justify="space-between" align="center">
                <Text size="2rem" fw={700} c="dark">
                  ฿{price.toLocaleString()}
                </Text>
                <LikeButton
                  postId={post.id}
                  initialLiked={post.is_liked}
                  initialCount={post.like_count}
                  size="lg"
                  onAuthRequired={handleLikeAuthRequired}
                />
              </Group>

              <Divider />

              {/* Size */}
              {post.size && (
                <div>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">
                    {tCommon("postCard.size")}
                  </Text>
                  <Badge size="lg" variant="light" color="gray">
                    {post.size}
                  </Badge>
                </div>
              )}

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
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{ cursor: "pointer" }}
                onClick={() =>
                  navigate({ to: `/profile/${post.user.username}` })
                }
              >
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

              {/* Buy Button - prompts login */}
              <Button
                size="xl"
                leftSection={<IconShoppingCart size={20} />}
                onClick={handleBuyClick}
                mt="md"
                disabled={isBanned || post.is_sold}
              >
                {t("view.buyNow")} - ฿{price.toLocaleString()}
              </Button>

              {post.is_sold && (
                <Text ta="center" c="dimmed" size="sm">
                  {t("view.itemSold")}
                </Text>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={loginAction}
      />
    </>
  );
}
