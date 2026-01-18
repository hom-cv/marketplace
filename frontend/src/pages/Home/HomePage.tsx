import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    Container,
    Text,
    Button,
    TextInput,
    Box,
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

    const handleSearchClick = () => {
        navigate({ to: "/sign-up" });
    };

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
            {posts.length > 0 && (
                <section className={styles.preview}>
                    <Container size="lg">
                        <div className={styles.previewHeader}>
                            <Text size="sm" c="dimmed" tt="uppercase" fw={500} ls={0.5}>
                                {t("landing.explore.sectionLabel")}
                            </Text>
                        </div>

                        <div className={styles.grid}>
                            {posts.map((post) => (
                                <div
                                    key={post.id}
                                    className={styles.card}
                                    onClick={() => navigate({ to: "/login" })}
                                >
                                    <PostCard post={post} />
                                </div>
                            ))}
                        </div>

                        <div className={styles.fade}>
                            <Button
                                size="md"
                                radius="md"
                                onClick={() => navigate({ to: "/sign-up" })}
                                rightSection={<IconArrowRight size={16} />}
                            >
                                {t("guestExplore.signUpToSeeMore")}
                            </Button>
                        </div>
                    </Container>
                </section>
            )}
        </div>
    );
}
