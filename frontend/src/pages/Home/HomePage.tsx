import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    Container,
    Text,
    Button,
    Group,
    SimpleGrid,
} from "@mantine/core";
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
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const { t } = useTranslation("common");

    // Fetch preview posts for the landing page
    const { data: postsData } = useQuery({
        queryKey: ["posts", "guest-landing-preview"],
        queryFn: () => getPosts(0, 16), // Fetch 16 items for a nice 4x4 grid
    });

    const posts = useMemo(() => {
        return postsData?.items ?? [];
    }, [postsData]);

    useEffect(() => {
        if (token) {
            navigate({ to: "/app" });
        }
    }, [token, navigate]);

    return (
        <div className={styles.wrapper}>
            <Container size="xl" className={styles.container}>
                {/* Hero Section */}
                <div className={styles.heroSection}>
                    <h1 className={styles.heroTitle}>
                        {t("landing.hero.title")}
                    </h1>

                    <p className={styles.heroSubtitle}>
                        {t("landing.hero.subtitle")}
                    </p>

                    <div className={styles.heroActions}>
                        <Group justify="center" gap="md">
                            <Button
                                size="lg"
                                radius="md"
                                onClick={() => navigate({ to: "/sign-up" })}
                                rightSection={<IconArrowRight size={18} />}
                            >
                                {t("buttons.getStarted")}
                            </Button>

                        </Group>
                    </div>
                </div>

                {/* Features Section */}
                <div className={styles.featuresSection}>
                    <h2 className={styles.sectionTitle}>{t("landing.features.sectionTitle")}</h2>
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
                        {[
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
                        ].map((feature, index) => (
                            <div key={feature.title} className={styles.featureCard}>
                                <div className={styles.iconWrapper}>
                                    <feature.icon size={24} stroke={1.5} />
                                </div>
                                <Text fw={600} mb={4}>
                                    {feature.title}
                                </Text>
                                <Text c="dimmed" size="sm" lh={1.5}>
                                    {feature.description}
                                </Text>
                            </div>
                        ))}
                    </SimpleGrid>
                </div>

                {/* Explore Preview Section */}
                <div id="explore-section" className={styles.exploreSection}>
                    <h2 className={styles.sectionTitle}>{t("landing.explore.sectionTitle")}</h2>
                    {posts.length > 0 && (
                        <>
                            <div className={styles.exploreGrid}>
                                {posts.map((post) => (
                                    <div
                                        key={post.id}
                                        className={styles.cardWrapper}
                                        onClick={() => navigate({ to: "/login" })}
                                    >
                                        <PostCard post={post} />
                                    </div>
                                ))}
                            </div>

                            {/* CTA Overlay Area */}
                            <div className={styles.ctaArea}>
                                <Button
                                    size="md"
                                    radius="xl"
                                    onClick={() => navigate({ to: "/sign-up" })}
                                    rightSection={<IconArrowRight size={16} />}
                                >
                                    {t("guestExplore.signUpToSeeMore")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Container >
        </div >
    );
}
