/**
 * Home Page
 * Redirects logged-in users to /app.
 */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
    Container,
    Title,
    Text,
    Button,
    Group,
    SimpleGrid,
    ThemeIcon,
} from "@mantine/core";
import {
    IconArrowRight,
    IconShieldCheck,
    IconUsers,
    IconWorld,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";

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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Container size="lg" py={80} style={{ flex: 1 }}>
                {/* Hero Section */}
                <div style={{ textAlign: "center", marginBottom: 80 }}>
                    <Title
                        order={1}
                        style={{
                            fontSize: "4rem",
                            fontWeight: 900,
                            letterSpacing: "-1px",
                            lineHeight: 1.1,
                            marginBottom: 20,
                        }}
                    >
                        {t("landing.hero.title")}
                    </Title>
                    <Text c="dimmed" size="xl" maw={600} mx="auto" mb={40}>
                        {t("landing.hero.subtitle")}
                    </Text>
                    <Group justify="center">
                        <Button
                            size="xl"
                            radius="md"
                            onClick={() => navigate({ to: "/explore" })}
                            rightSection={<IconArrowRight size={20} />}
                        >
                            {t("landing.hero.cta")}
                        </Button>
                    </Group>
                </div>

                {/* Features Section */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={50} verticalSpacing={50}>
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
                        <div key={index}>
                            <ThemeIcon
                                size={50}
                                radius="md"
                                variant="light"
                                color="blue" // You can customize the color or make it dynamic
                                mb="md"
                            >
                                <feature.icon size={26} stroke={1.5} />
                            </ThemeIcon>
                            <Text fz="lg" fw={700} mb="sm">
                                {feature.title}
                            </Text>
                            <Text c="dimmed" lh={1.6}>
                                {feature.description}
                            </Text>
                        </div>
                    ))}
                </SimpleGrid>
            </Container>
        </div>
    );
}
