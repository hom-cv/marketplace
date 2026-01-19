/**
 * HomePage - Landing page with Soft & Airy design
 * Features: Hero with search, category pills, discovery section
 */

import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Container,
  Text,
  Button,
  Group,
  TextInput,
  Badge,
  Box,
  ScrollArea,
} from "@mantine/core";
import {
  IconArrowRight,
  IconSearch,
  IconShirt,
  IconJacket,
  IconShoe,
  IconDiamond,
  IconHanger,
  IconDots,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import type { PostType } from "@/api/types/post";
import styles from "./HomePage.module.css";

// Category icons mapping
const categoryIcons: Record<PostType, React.ReactNode> = {
  SHIRT: <IconShirt size={14} />,
  PANTS: <IconHanger size={14} />,
  JACKET: <IconJacket size={14} />,
  SHOES: <IconShoe size={14} />,
  ACCESSORIES: <IconDiamond size={14} />,
  OTHER: <IconDots size={14} />,
};

export function HomePage() {
  const PREVIEW_POST_COUNT = 16;
  const RECENT_POST_COUNT = 8;

  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { t } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");

  // Fetch preview posts for the landing page
  const { data: postsData } = useQuery({
    queryKey: ["posts", "guest-landing-preview"],
    queryFn: () => getPosts(0, PREVIEW_POST_COUNT),
  });

  const posts = useMemo(() => {
    return postsData?.items ?? [];
  }, [postsData]);

  // Get recent posts for carousel
  const recentPosts = useMemo(() => {
    return posts.slice(0, RECENT_POST_COUNT);
  }, [posts]);

  useEffect(() => {
    if (token) {
      navigate({ to: "/app" });
    }
  }, [token, navigate]);

  // Category options for pills
  const categories: { value: PostType; label: string }[] = useMemo(
    () => [
      { value: "SHIRT", label: tListings("categories.shirt") },
      { value: "PANTS", label: tListings("categories.pants") },
      { value: "JACKET", label: tListings("categories.jacket") },
      { value: "SHOES", label: tListings("categories.shoes") },
      { value: "ACCESSORIES", label: tListings("categories.accessories") },
      { value: "OTHER", label: tListings("categories.other") },
    ],
    [tListings]
  );

  const handleCategoryClick = (category: PostType) => {
    navigate({ to: "/explore", search: { categories: category } });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    if (search?.trim()) {
      navigate({ to: "/explore", search: { q: search.trim() } });
    } else {
      navigate({ to: "/explore" });
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Hero Section with Gradient Background */}
      <div className={styles.heroSection}>
        <Container size="lg" className={styles.heroContainer}>
          <h1 className={styles.heroTitle}>
            {t("landing.hero.title")}
          </h1>

          <p className={styles.heroSubtitle}>
            {t("landing.hero.subtitle")}
          </p>

          {/* Prominent Search Bar */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <TextInput
              name="search"
              placeholder={t("landing.search.placeholder")}
              size="sm"
              radius="xl"
              leftSection={<IconSearch size={16} />}
              classNames={{
                root: styles.searchRoot,
                input: styles.searchInput,
              }}
            />
            <Button
              type="submit"
              size="sm"
              radius="xl"
              className={styles.searchButton}
            >
              {t("landing.search.button")}
            </Button>
          </form>

          {/* Category Pills - Desktop only */}
          <Box visibleFrom="sm" className={styles.categorySection}>
            <Group gap="xs" wrap="wrap" className={styles.categoryPills}>
              {categories.map((category) => (
                <Badge
                  key={category.value}
                  size="md"
                  variant="light"
                  color="gray"
                  leftSection={categoryIcons[category.value]}
                  className={styles.categoryPill}
                  onClick={() => handleCategoryClick(category.value)}
                >
                  {category.label}
                </Badge>
              ))}
            </Group>
          </Box>
        </Container>
      </div>

      {/* Recently Added Carousel */}
      {recentPosts.length > 0 && (
        <section className={styles.recentSection}>
          <Container size="xl">
            <Group justify="space-between" mb="md">
              <Text size="md" fw={600}>
                {t("landing.recent.title")}
              </Text>
              <Button
                variant="subtle"
                size="xs"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => navigate({ to: "/explore" })}
              >
                {t("landing.recent.viewAll")}
              </Button>
            </Group>
            <ScrollArea scrollbarSize={8} type="hover" offsetScrollbars>
              <div className={styles.carouselTrack}>
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className={styles.carouselItem}
                    onClick={() => navigate({ to: "/explore/$postId", params: { postId: String(post.id) } })}
                  >
                    <PostCard post={post} linkPrefix="/explore" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Container>
        </section>
      )}

      {/* Discovery Grid Section */}
      <section className={styles.discoverySection}>
        <Container size="xl">
          <Text size="md" fw={600} mb="md" ta="center">
            {t("landing.explore.sectionTitle")}
          </Text>

          {posts.length > 0 && (
            <div className={styles.exploreWrapper}>
              <div className={styles.exploreGrid}>
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={styles.cardWrapper}
                    onClick={() => navigate({ to: "/explore/$postId", params: { postId: String(post.id) } })}
                  >
                    <PostCard post={post} linkPrefix="/explore" />
                  </div>
                ))}
              </div>

              {/* Gradient Fade CTA */}
              <div className={styles.ctaOverlay}>
                <Button
                  size="md"
                  radius="xl"
                  onClick={() => navigate({ to: "/explore" })}
                  rightSection={<IconArrowRight size={16} />}
                  className={styles.ctaButton}
                >
                  {t("guestExplore.exploreListings")}
                </Button>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Features Section */}
      <Box hiddenFrom="sm">
        <section className={styles.featuresSection}>
          <Container size="lg">
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <Text fw={600} size="sm">{t("landing.features.secure.title")}</Text>
                <Text size="xs" c="dimmed">{t("landing.features.secure.description")}</Text>
              </div>
              <div className={styles.featureItem}>
                <Text fw={600} size="sm">{t("landing.features.community.title")}</Text>
                <Text size="xs" c="dimmed">{t("landing.features.community.description")}</Text>
              </div>
              <div className={styles.featureItem}>
                <Text fw={600} size="sm">{t("landing.features.global.title")}</Text>
                <Text size="xs" c="dimmed">{t("landing.features.global.description")}</Text>
              </div>
            </div>
          </Container>
        </section>
      </Box>
    </div>
  );
}
