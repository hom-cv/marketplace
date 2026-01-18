/**
 * Post View Page - View a single post with image carousel and buy button
 * Similar layout to CreatePost page but for viewing/purchasing
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
  Menu,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconShoppingCart,
  IconArrowLeft,
  IconPhoto,
  IconDotsVertical,
  IconFlag,
  IconUserExclamation,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { EarningsPreview } from "@/components/EarningsPreview";
import { ReportModal } from "@/components/ReportModal";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import type { PostType } from "@/api/types/post";
import type { ReportType } from "@/api/types/admin";
import { POST_TYPE_COLORS } from "@/constants/posts";
import styles from "./PostViewPage.module.css";

export function PostViewPage() {
  const navigate = useNavigate();
  const { postId: postIdString } = useParams({
    from: "/protected/app/posts/$postId",
  });
  const postId = postIdString ? parseInt(postIdString, 10) : null;
  const currentUser = useAuthStore((state) => state.user);
  const { t } = useTranslation("listings");

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
    [t],
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reportModalOpened, setReportModalOpened] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("post");
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);
  const { t: tCommon } = useTranslation("common");

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
          {error instanceof Error ? error.message : t("view.failedToLoad")}
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
            {t("view.backToExplore")}
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
                  {t("view.reportListing")}
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconUserExclamation size={14} />}
                  onClick={() => {
                    setReportType("user");
                    setReportModalOpened(true);
                  }}
                >
                  {t("view.reportUser")}
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
                <Badge color={POST_TYPE_COLORS[post.type]} size="lg" variant="light">
                  {typeLabels[post.type]}
                </Badge>
                {isOwner && (
                  <Badge color="gray" size="lg" variant="light">
                    {t("view.yourListing")}
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
                {
                  <LikeButton
                    postId={post.id}
                    initialLiked={post.is_liked}
                    initialCount={post.like_count}
                    size="lg"
                    onAuthRequired={openLoginModal}
                  />
                }
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

              {/* Buy Button */}
              {!isOwner && (
                <Button
                  size="xl"
                  leftSection={<IconShoppingCart size={20} />}
                  onClick={() => navigate({ to: `/app/checkout/${postId}` })}
                  mt="md"
                  disabled={isBanned}
                >
                  {t("view.buyNow")} - ฿{price.toLocaleString()}
                </Button>
              )}

              {isOwner && (
                <EarningsPreview
                  postId={postId ?? undefined}
                  title={t("view.yourEarnings")}
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
        entityId={reportType === "post" ? post.id : post.user.id}
        entityName={
          reportType === "post" ? post.title : `@${post.user.username}`
        }
      />
      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={tCommon("likes.likeAction")}
      />
    </>
  );
}
