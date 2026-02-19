/**
 * ImageUploadSection - Hero image with filmstrip thumbnails
 * Drag-and-drop zone with premium visual feedback
 */

import { useRef, useState, useCallback } from "react";
import { FileButton } from "@mantine/core";
import { IconPlus, IconX, IconPhoto, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./ImageUploadSection.module.css";

interface ImageUploadSectionProps {
  images: File[];
  imagePreviews: string[];
  selectedImageIndex: number;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  onSelectImage: (index: number) => void;
}

export function ImageUploadSection({
  images,
  imagePreviews,
  selectedImageIndex,
  onAddImages,
  onRemoveImage,
  onSelectImage,
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

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length > 0) {
        onAddImages(files);
      }
    },
    [onAddImages]
  );

  const hasImages = images.length > 0;

  return (
    <div className={styles.container}>
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
            onChange={(files) => files && onAddImages(files)}
            accept="image/*"
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
                  {t("images.maxImages", { max: 5 })}
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

      {/* Thumbnail Filmstrip */}
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
            <button
              type="button"
              className={styles.thumbnailRemove}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage(index);
              }}
            >
              <IconX size={10} />
            </button>
          </div>
        ))}

        {images.length < 5 && (
          <FileButton
            onChange={(files) => files && onAddImages(files)}
            accept="image/*"
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
    </div>
  );
}
