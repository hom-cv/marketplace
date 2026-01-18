/**
 * PostImageGallery - Shared image gallery component for post view pages
 * Displays main image with thumbnail carousel
 */

import { useState } from "react";
import { Box, Image, Group } from "@mantine/core";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import styles from "@/styles/postView.module.css";

interface PostImageGalleryProps {
  /** Array of image URLs */
  imageUrls: string[];
  /** Alt text for images */
  alt: string;
}

/**
 * Image gallery with main display and thumbnail carousel
 */
export function PostImageGallery({ imageUrls, alt }: PostImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  return (
    <Box className={styles.imageSection}>
      {/* Main Image Display */}
      <Box className={styles.mainImageWrapper}>
        {imageUrls.length > 0 ? (
          <Image
            src={imageUrls[selectedImageIndex]}
            alt={alt}
            className={styles.mainImage}
            fit="contain"
            radius="md"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </Box>

      {/* Thumbnail Carousel */}
      {imageUrls.length > 1 && (
        <Group gap="xs" mt="md" wrap="nowrap" className={styles.thumbnailRow}>
          {imageUrls.map((url, index) => (
            <Box
              key={index}
              className={`${styles.thumbnail} ${index === selectedImageIndex ? styles.thumbnailActive : ""}`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <Image src={url} alt={`${alt} ${index + 1}`} fit="cover" radius="sm" />
            </Box>
          ))}
        </Group>
      )}
    </Box>
  );
}
