/**
 * Public Post View Page - Soft & Airy design
 * Features: Full-bleed image gallery, sticky buy bar, improved mobile layout
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
  Group,
  Badge,
  Paper,
  Loader,
  Center,
  Divider,
  Avatar,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconShoppingCart,
  IconArrowLeft,
  IconUser,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPost } from "@/api/posts";
import { MeasurementsDisplay } from "@/components/MeasurementsDisplay";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { PostImageGallery } from "@/components/PostImageGallery";
import { POST_TYPE_COLORS, getPostTypeLabels } from "@/constants/postTypes";
import { formatSizeDisplay } from "@/api/types/post";
import styles from "./PublicPostViewPage.module.css";

export function PublicPostViewPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const postIdString = params.postId;
  const postId = postIdString ? parseInt(postIdString, 10) : null;
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  // Type labels with translations (from shared constants)
  const typeLabels = useMemo(() => getPostTypeLabels(t), [t]);
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
        <Alert icon={<IconAlertCircle size={16} />} title={tCommon("status.error")} color="red" radius="lg">
          {error instanceof Error ? error.message : t("view.failedToLoad")}
        </Alert>
      </Container>
    );
  }

  const price = parseFloat(post.price);

  return (
    <>
      <div className={styles.wrapper}>
        {/* Mobile Header */}
        <Box hiddenFrom="md" className={styles.mobileHeader}>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate({ to: "/explore" })}
            radius="lg"
          >
            {t("view.backToExplore")}
          </Button>
        </Box>

        <Container size="lg" py="lg" className={styles.container}>
          {/* Desktop Header */}
          <Group justify="space-between" mb="lg" visibleFrom="md">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate({ to: "/explore" })}
              radius="lg"
            >
              {t("view.backToExplore")}
            </Button>
          </Group>

          <div className={styles.layout}>
            {/* Left: Image Gallery */}
            <div className={styles.imageColumn}>
              <div className={styles.galleryWrapper}>
                <PostImageGallery imageUrls={imageUrls} alt={post.title} />

                {/* Floating Like Button on Image (Mobile) */}
                <Box hiddenFrom="md" className={styles.floatingLike}>
                  <LikeButton
                    postId={post.id}
                    initialLiked={post.is_liked}
                    initialCount={post.like_count}
                    size="lg"
                    onAuthRequired={handleLikeAuthRequired}
                    variant="floating"
                  />
                </Box>
              </div>
            </div>

            {/* Right: Details */}
            <div className={styles.detailsColumn}>
              <Stack gap="lg">
                {/* Category badge */}
                <Group>
                  <Badge color={POST_TYPE_COLORS[post.type]} size="md" variant="light" radius="md">
                    {typeLabels[post.type]}
                  </Badge>
                  {post.is_sold && (
                    <Badge color="red" size="md" variant="filled" radius="md">
                      {tCommon("badges.sold")}
                    </Badge>
                  )}
                </Group>

                {/* Title */}
                <Title order={2} className={styles.title}>{post.title}</Title>

                {/* Price and Like */}
                <Group justify="space-between" align="center">
                  <Text className={styles.price}>
                    ฿{price.toLocaleString()}
                  </Text>
                  <Box visibleFrom="md">
                    <LikeButton
                      postId={post.id}
                      initialLiked={post.is_liked}
                      initialCount={post.like_count}
                      size="lg"
                      onAuthRequired={handleLikeAuthRequired}
                    />
                  </Box>
                </Group>

                <Divider />

                {/* Size */}
                {post.size && (
                  <div>
                    <Text size="sm" fw={500} c="dimmed" mb="xs">
                      {tCommon("postCard.size")}
                    </Text>
                    <Badge size="md" variant="light" color="gray" radius="md">
                      {formatSizeDisplay(post.size, post.type)}
                    </Badge>
                  </div>
                )}

                {/* Description */}
                <div>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">
                    {t("view.description")}
                  </Text>
                  <Text size="sm" className={styles.description}>
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
                  p="sm"
                  radius="md"
                  withBorder
                  className={styles.sellerCard}
                  onClick={() => navigate({ to: `/profile/${post.user.username}` })}
                >
                  <Group>
                    <Avatar size="md" radius="xl" color="blue">
                      <IconUser size={20} />
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>@{post.user.username}</Text>
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
                    radius="lg"
                  >
                    {post.is_banned
                      ? t("view.listingRemoved")
                      : t("view.sellerSuspended")}
                  </Alert>
                )}

                {/* Buy Button - Desktop */}
                <Box visibleFrom="md">
                  <Button
                    size="lg"
                    radius="md"
                    leftSection={<IconShoppingCart size={18} />}
                    onClick={handleBuyClick}
                    fullWidth
                    disabled={isBanned || post.is_sold}
                    className={styles.buyButton}
                  >
                    {t("view.buyNow")} - ฿{price.toLocaleString()}
                  </Button>

                  {post.is_sold && (
                    <Text ta="center" c="dimmed" size="sm" mt="sm">
                      {t("view.itemSold")}
                    </Text>
                  )}
                </Box>
              </Stack>
            </div>
          </div>
        </Container>

        {/* Mobile Sticky Buy Bar */}
        <Box hiddenFrom="md" className={styles.stickyBuyBar}>
          <div className={styles.buyBarContent}>
            <div className={styles.buyBarPrice}>
              <Text size="xs" c="dimmed">{t("view.price")}</Text>
              <Text fw={600} size="md">฿{price.toLocaleString()}</Text>
            </div>
            <Button
              size="sm"
              radius="md"
              leftSection={<IconShoppingCart size={16} />}
              onClick={handleBuyClick}
              disabled={isBanned || post.is_sold}
              className={styles.buyBarButton}
            >
              {post.is_sold ? tCommon("badges.sold") : t("view.buyNow")}
            </Button>
          </div>
        </Box>
      </div>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={loginAction}
      />
    </>
  );
}
