/**
 * ImageUploadSection - Hero image with filmstrip thumbnails
 * Drag-and-drop zone with premium visual feedback
 */

import { useRef, useState, useCallback } from "react";
import { FileButton, Stack } from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconPhoto,
  IconUpload,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./ImageUploadSection.module.css";

/** Allowed image MIME types (excludes SVG to prevent XSS) */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** Accept attribute for file input (excludes SVG) */
const ACCEPT_IMAGES = ".jpg,.jpeg,.png,.gif,.webp";

/** Filter files to only allow safe image types */
function filterSafeImages(files: File[]): File[] {
  return files.filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type));
}

interface ImageUploadSectionProps {
  imageCount: number;
  imagePreviews: string[];
  selectedImageIndex: number;
  maxImages: number;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  onSelectImage: (index: number) => void;
  /** When provided, renders reorder controls on each thumbnail. */
  onMoveImage?: (from: number, to: number) => void;
}

export function ImageUploadSection({
  imageCount,
  imagePreviews,
  selectedImageIndex,
  maxImages,
  onAddImages,
  onRemoveImage,
  onSelectImage,
  onMoveImage,
}: ImageUploadSectionProps) {
  const { t } = useTranslation("listings");
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = filterSafeImages(Array.from(e.dataTransfer.files));
      if (files.length > 0) {
        onAddImages(files);
      }
    },
    [onAddImages]
  );

  const handleFilesSelected = useCallback(
    (files: File[] | null) => {
      if (files) {
        const safeFiles = filterSafeImages(files);
        if (safeFiles.length > 0) onAddImages(safeFiles);
      }
    },
    [onAddImages],
  );

  const hasImages = imageCount > 0;

  return (
    <Stack gap={12}>
      {/* Hero Image Area */}
      <div
        ref={dropZoneRef}
        className={`${styles.heroArea} ${isDragging ? styles.heroAreaDragging : ""} ${hasImages ? styles.heroAreaWithImage : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasImages ? (
          <img
            src={imagePreviews[selectedImageIndex]}
            alt="Preview"
            className={styles.heroImage}
          />
        ) : (
          <FileButton
            onChange={handleFilesSelected}
            accept={ACCEPT_IMAGES}
            multiple
          >
            {(props) => (
              <button type="button" className={styles.uploadPrompt} {...props}>
                <div className={styles.uploadIcon}>
                  <IconPhoto size={48} strokeWidth={1} />
                </div>
                <span className={styles.uploadText}>
                  {t("images.dragOrClick")}
                </span>
                <span className={styles.uploadHint}>
                  {t("images.maxImages", { max: maxImages })}
                </span>
              </button>
            )}
          </FileButton>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className={styles.dragOverlay}>
            <IconUpload size={32} />
            <span>{t("images.dropHere")}</span>
          </div>
        )}
      </div>

      {/* Toolbar acting on the currently selected image */}
      {hasImages && (
        <div className={styles.heroToolbar}>
          {onMoveImage && (
            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.toolbarMove}`}
              aria-label={t("images.moveLeft")}
              disabled={selectedImageIndex === 0}
              onClick={() => onMoveImage(selectedImageIndex, selectedImageIndex - 1)}
            >
              <IconChevronLeft size={18} />
            </button>
          )}
          <button
            type="button"
            className={`${styles.toolbarButton} ${styles.toolbarDelete}`}
            onClick={() => onRemoveImage(selectedImageIndex)}
          >
            <IconTrash size={16} />
            <span>{t("images.remove")}</span>
          </button>
          {onMoveImage && (
            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.toolbarMove}`}
              aria-label={t("images.moveRight")}
              disabled={selectedImageIndex === imagePreviews.length - 1}
              onClick={() => onMoveImage(selectedImageIndex, selectedImageIndex + 1)}
            >
              <IconChevronRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* Thumbnail Filmstrip (selection only) */}
      <div className={styles.filmstrip}>
        {imagePreviews.map((previewUrl, index) => (
          <div
            key={previewUrl}
            className={`${styles.thumbnail} ${index === selectedImageIndex ? styles.thumbnailActive : ""}`}
            onClick={() => onSelectImage(index)}
          >
            <img src={previewUrl} alt={`Thumbnail ${index + 1}`} />
            {index === 0 && (
              <span className={styles.coverBadge}>{t("images.cover")}</span>
            )}
          </div>
        ))}

        {imageCount < maxImages && (
          <FileButton
            onChange={handleFilesSelected}
            accept={ACCEPT_IMAGES}
            multiple
          >
            {(props) => (
              <button type="button" className={styles.addButton} {...props}>
                <IconPlus size={20} />
              </button>
            )}
          </FileButton>
        )}
      </div>
    </Stack>
  );
}
