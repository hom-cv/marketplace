/**
 * ImagePlaceholder - Reusable placeholder for missing images
 * Used in post views, cards, and anywhere an image is unavailable
 */

import { Box, Text } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./ImagePlaceholder.module.css";

interface ImagePlaceholderProps {
  /** Size of the icon (default: 64) */
  iconSize?: number;
  /** Whether to show the text label (default: true) */
  showText?: boolean;
  /** Custom text override */
  text?: string;
  /** Additional class name */
  className?: string;
}

/**
 * A placeholder component for when images are unavailable.
 * Displays a photo icon with optional "No images available" text.
 */
export function ImagePlaceholder({
  iconSize = 64,
  showText = true,
  text,
  className,
}: ImagePlaceholderProps) {
  const { t } = useTranslation("listings");

  return (
    <Box className={`${styles.placeholder} ${className || ""}`}>
      <IconPhoto
        size={iconSize}
        stroke={1}
        className={styles.icon}
      />
      {showText && (
        <Text c="dimmed" size="sm" mt="md">
          {text || t("images.noImagesAvailable")}
        </Text>
      )}
    </Box>
  );
}
