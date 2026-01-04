/**
 * Home Page
 * Redirects logged-in users to /app.
 */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
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

// ... imports
import styles from "./HomePage.module.css";

export function HomePage() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const { t } = useTranslation("common");

    useEffect(() => {
        if (token) {
            navigate({ to: "/app" });
        }
    }, [token, navigate]);

    return (
        <div className={styles.wrapper}>
            <Container size="lg" className={styles.container}>
                {/* Hero Section */}
                <div className={styles.heroSection}>
                    <h1 className={styles.heroTitle}>
                        {t("landing.hero.title")}
                    </h1>

                    <p className={styles.heroSubtitle}>
                        {t("landing.hero.subtitle")}
                    </p>

                    <div className={styles.heroActions}>
                        <Group justify="center">
                            <Button
                                size="xl"
                                radius="xl" // Fully rounded for modern feel
                                h={56} // Taller button
                                px={40} // Wider button
                                fz="lg"
                                fw={600}
                                onClick={() => navigate({ to: "/explore" })}
                                rightSection={<IconArrowRight size={20} className="mantine-rotate-rtl" />}
                                variant="filled"
                                color="blue"
                                style={{
                                    boxShadow: '0 10px 20px -5px rgba(34, 139, 230, 0.3)',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                }}
                            >
                                {t("landing.hero.cta")}
                            </Button>
                        </Group>
                    </div>
                </div>

                {/* Features Section */}
                <div className={styles.featuresGrid}>
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
                            <div key={index} className={styles.featureCard}>
                                <div className={styles.iconWrapper}>
                                    <feature.icon size={28} stroke={1.5} />
                                </div>
                                <Text fz="xl" fw={700} mb="xs" style={{ letterSpacing: '-0.01em' }}>
                                    {feature.title}
                                </Text>
                                <Text c="dimmed" lh={1.6}>
                                    {feature.description}
                                </Text>
                            </div>
                        ))}
                    </SimpleGrid>
                </div>
            </Container>
        </div>
    );
}
