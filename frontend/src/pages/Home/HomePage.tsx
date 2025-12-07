/**
 * Home Page
 * Redirects logged-in users to /app.
 */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Container } from "@mantine/core";
import { useAuthStore } from "../../stores/authStore";

export function HomePage() {
    const navigate = useNavigate();
    const { token } = useAuthStore();

    useEffect(() => {
        if (token) {
            navigate({ to: "/app" });
        }
    }, [token, navigate]);

    return (
        <div>
            <Container size="md" py="md">
                <h1>Welcome to Marketplace</h1>
            </Container>
        </div>
    );
}
