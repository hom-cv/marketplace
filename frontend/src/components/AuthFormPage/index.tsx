/**
 * Reusable auth form page wrapper
 */

import type { ReactNode } from "react";
import { Container, Box, Text, Stack } from "@mantine/core";
import styles from "./AuthFormPage.module.css";

interface AuthFormPageProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}

export function AuthFormPage({ title, children, footer, maxWidth = 380 }: AuthFormPageProps) {
  return (
    <div className={styles.page}>
      <Container size={maxWidth}>
        <Box className={styles.card}>
          <Stack gap="md">
            <Text className={styles.title}>{title}</Text>
            {children}
          </Stack>
          {footer && <div className={styles.footer}>{footer}</div>}
        </Box>
      </Container>
    </div>
  );
}
