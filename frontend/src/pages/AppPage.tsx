/**
 * Protected App Page - Main authenticated application area
 */

import { Container, Title, Text } from "@mantine/core";
import { useAuthStore } from "../stores/authStore";

export function AppPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <Container my={40}>
      <Title>Welcome to the App</Title>
      <Text c="dimmed" mt="md">
        You are logged in as {user?.email_address}
      </Text>
    </Container>
  );
}
