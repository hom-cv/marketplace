import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    Container,
    Text,
    Button,
    TextInput,
    Box,
    Skeleton,
    Group,
} from "@mantine/core";
import { IconSearch, IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import styles from "./HomePage.module.css";

export function HomePage() {
    const PREVIEW_POST_COUNT = 8;

    const navigate = useNavigate();
    const { token } = useAuthStore();
    const { t } = useTranslation("common");

    const { data: postsData, isLoading } = useQuery({
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

    const handleSearchClick = () => {
        navigate({ to: "/explore" });
    };

    const { t: tNav } = useTranslation("navigation");

    return (
        <div className={styles.page}>
            {/* Hero */}
            <section className={styles.hero}>
                <Container size="sm">
                    <h1 className={styles.title}>{t("landing.hero.title")}</h1>
                    <p className={styles.subtitle}>{t("landing.hero.subtitle")}</p>

                    <Box className={styles.searchBox} onClick={handleSearchClick}>
                        <TextInput
                            placeholder={t("landing.hero.searchPlaceholder")}
                            leftSection={<IconSearch size={18} stroke={1.5} />}
                            size="md"
                            radius="md"
                            readOnly
                            classNames={{ input: styles.searchInput }}
                        />
                    </Box>
                </Container>
            </section>

            {/* Preview */}
            <section className={styles.preview}>
                <Container size="lg">
                    <div className={styles.previewHeader}>
                        <Text size="sm" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: 0.5 }}>
                            {t("landing.explore.sectionLabel")}
                        </Text>
                    </div>

                    <div className={styles.grid}>
                        {isLoading
                            ? Array.from({ length: PREVIEW_POST_COUNT }).map((_, i) => (
                                <div key={i} className={styles.skeletonCard}>
                                    <Skeleton height={200} radius="md" />
                                    <Skeleton height={16} mt={12} width="70%" radius="sm" />
                                    <Skeleton height={14} mt={8} width="40%" radius="sm" />
                                </div>
                            ))
                            : posts.map((post) => (
                                <div
                                    key={post.id}
                                    className={styles.card}
                                    onClick={() => navigate({ to: "/posts/$postId", params: { postId: String(post.id) } })}
                                >
                                    <PostCard post={post} />
                                </div>
                            ))}
                    </div>

                    {!isLoading && posts.length > 0 && (
                        <div className={styles.fade}>
                            <Button
                                size="md"
                                radius="md"
                                onClick={() => navigate({ to: "/explore" })}
                                rightSection={<IconArrowRight size={16} />}
                            >
                                {t("guestExplore.exploreAll")}
                            </Button>
                        </div>
                    )}
                </Container>
            </section>

            {/* Mobile CTA Bar */}
            <div className={styles.mobileCta}>
                <Group gap="sm" grow>
                    <Button
                        component={Link}
                        to="/login"
                        variant="default"
                        size="md"
                    >
                        {tNav("header.login")}
                    </Button>
                    <Button
                        component={Link}
                        to="/sign-up"
                        size="md"
                        rightSection={<IconArrowRight size={16} />}
                    >
                        {tNav("header.signUp")}
                    </Button>
                </Group>
            </div>
        </div>
    );
}
