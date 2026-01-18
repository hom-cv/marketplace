/**
 * Reusable form error component
 */

import { Box, Group, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import styles from "./FormError.module.css";

interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  return (
    <Box className={styles.error}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <IconAlertCircle size={16} className={styles.icon} />
        <Text size="sm">{message}</Text>
      </Group>
    </Box>
  );
}
