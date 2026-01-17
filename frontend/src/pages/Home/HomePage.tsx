import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Container, Button, SimpleGrid } from "@mantine/core";
import {
  IconArrowRight,
  IconShieldCheck,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import styles from "./HomePage.module.css";

export function HomePage() {
  const PREVIEW_POST_COUNT = 16;

  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { t } = useTranslation("common");

  const { data: postsData } = useQuery({
    queryKey: ["posts", "guest-landing-preview"],
    queryFn: () => getPosts(0, PREVIEW_POST_COUNT),
  });

  const posts = useMemo(() => {
    return postsData?.items ?? [];
  }, [postsData]);

  useEffect(() => {
    if (token) {
      navigate({ to: "/app" });
    }
  }, [token, navigate]);

  const features = [
    {
      icon: IconShieldCheck,
      title: t("landing.features.secure.title"),
      description: t("landing.features.secure.description"),
    },
    {
      icon: IconUsers,
      title: t("landing.features.community.title"),
      description: t("landing.features.community.description"),
    },
    {
      icon: IconWorld,
      title: t("landing.features.global.title"),
      description: t("landing.features.global.description"),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <Container size="xl" className={styles.container}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <h1 className={styles.heroTitle}>{t("landing.hero.title")}</h1>
          <p className={styles.heroSubtitle}>{t("landing.hero.subtitle")}</p>
          <div className={styles.heroActions}>
            <Button
              variant="outline"
              color="dark"
              size="md"
              radius={0}
              onClick={() => navigate({ to: "/sign-up" })}
              rightSection={<IconArrowRight size={16} stroke={1.5} />}
            >
              {t("buttons.getStarted")}
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>
            {t("landing.features.sectionTitle")}
          </h2>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={0}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.iconWrapper}>
                  <feature.icon size={20} stroke={1.5} />
                </div>
                <div className={styles.featureTitle}>{feature.title}</div>
                <div className={styles.featureDescription}>
                  {feature.description}
                </div>
              </div>
            ))}
          </SimpleGrid>
        </section>

        {/* Explore Preview Section */}
        {posts.length > 0 && (
          <section id="explore-section" className={styles.exploreSection}>
            <h2 className={styles.sectionTitle}>
              {t("landing.explore.sectionTitle")}
            </h2>
            <div className={styles.exploreGrid}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className={styles.cardWrapper}
                  onClick={() => navigate({ to: "/login" })}
                >
                  <PostCard post={post} variant="minimal" />
                </div>
              ))}
            </div>

            <div className={styles.ctaArea}>
              <Button
                variant="outline"
                color="dark"
                size="sm"
                radius={0}
                onClick={() => navigate({ to: "/sign-up" })}
                rightSection={<IconArrowRight size={14} stroke={1.5} />}
              >
                {t("guestExplore.signUpToSeeMore")}
              </Button>
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
