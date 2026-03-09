import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Group } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import styles from "./HomePage.module.css";

const PREVIEW_POST_COUNT = 12;

export function HomePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { t } = useTranslation("common");

  const { data: postsData } = useQuery({
    queryKey: ["posts", "guestLandingPreview"],
    queryFn: () => getPosts(0, PREVIEW_POST_COUNT),
  });

  const posts = useMemo(() => {
    return postsData?.items ?? [];
  }, [postsData]);

  useEffect(() => {
    if (token) {
      navigate({ to: "/explore" });
    }
  }, [token, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{t("landing.hero.title")}</h1>
        <p className={styles.subtitle}>{t("landing.hero.subtitle")}</p>
        <Group justify="center">
          <Button
            size="md"
            onClick={() => navigate({ to: "/sign-up" })}
            rightSection={<IconArrowRight size={16} />}
          >
            {t("buttons.getStarted")}
          </Button>
        </Group>
      </div>

      <div className={styles.listings}>
        <h2 className={styles.sectionTitle}>
          {t("landing.explore.sectionTitle")}
        </h2>
        {posts.length > 0 && (
          <div className={styles.gridWrapper}>
            <div className={styles.grid}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} linkPrefix="/explore" />
              ))}
            </div>
            <div className={styles.fade}>
              <Button
                size="md"
                onClick={() => navigate({ to: "/explore" })}
                rightSection={<IconArrowRight size={16} />}
              >
                {t("guestExplore.exploreListings")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
