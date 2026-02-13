/**
 * PostImageCarousel - Swipeable image carousel with touch support
 * Features:
 * - Touch/swipe support on mobile
 * - Arrow navigation on desktop (hover to reveal)
 * - Dot indicators on mobile
 * - Thumbnail strip on desktop
 * - Keyboard navigation (arrow keys)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { IconChevronLeft, IconChevronRight, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./PostImageCarousel.module.css";

interface PostImageCarouselProps {
  imageUrls: string[];
  alt: string;
}

export function PostImageCarousel({ imageUrls, alt }: PostImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const { t } = useTranslation("listings");

  const imageCount = imageUrls.length;
  const hasMultipleImages = imageCount > 1;

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (index < 0) {
      setCurrentIndex(0);
    } else if (index >= imageCount) {
      setCurrentIndex(imageCount - 1);
    } else {
      setCurrentIndex(index);
    }
  }, [imageCount]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsDragging(true);
    // Update container width at the start of touch
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [hasMultipleImages]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !hasMultipleImages || containerWidth === 0) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;

    // Limit drag at edges
    const maxDrag = containerWidth * 0.3;

    if (currentIndex === 0 && diff > 0) {
      setDragOffset(Math.min(diff, maxDrag) * 0.3);
    } else if (currentIndex === imageCount - 1 && diff < 0) {
      setDragOffset(Math.max(diff, -maxDrag) * 0.3);
    } else {
      setDragOffset(diff);
    }
  }, [isDragging, hasMultipleImages, currentIndex, imageCount, containerWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !hasMultipleImages) return;

    const diff = currentXRef.current - startXRef.current;
    const threshold = 50; // Minimum swipe distance

    if (diff > threshold && currentIndex > 0) {
      goToPrev();
    } else if (diff < -threshold && currentIndex < imageCount - 1) {
      goToNext();
    }

    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, hasMultipleImages, currentIndex, imageCount, goToPrev, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasMultipleImages) return;

      // Only handle if carousel is focused or no other input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement ||
                            activeElement instanceof HTMLTextAreaElement ||
                            activeElement instanceof HTMLSelectElement;

      if (isInputFocused) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleImages, goToPrev, goToNext]);

  // Calculate transform
  const baseOffset = -currentIndex * 100;
  const dragPercent = containerWidth > 0 ? (dragOffset / containerWidth) * 100 : 0;
  const transform = `translateX(${baseOffset + dragPercent}%)`;

  if (imageCount === 0) {
    return (
      <div className={styles.carousel}>
        <div className={styles.imageContainer}>
          <div className={styles.placeholder}>
            <IconPhoto size={48} className={styles.placeholderIcon} />
            <span className={styles.placeholderText}>{t("images.noImagesAvailable")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.carousel}>
      {/* Main image container */}
      <div
        ref={containerRef}
        className={styles.imageContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`${styles.slideTrack} ${isDragging ? styles.dragging : ""}`}
          style={{ transform }}
        >
          {imageUrls.map((url, index) => (
            <div key={index} className={styles.slide}>
              <img
                src={url}
                alt={`${alt} ${index + 1}`}
                className={styles.image}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Navigation arrows (desktop) */}
        {hasMultipleImages && (
          <>
            <button
              className={`${styles.navButton} ${styles.navPrev}`}
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Previous image"
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              className={`${styles.navButton} ${styles.navNext}`}
              onClick={goToNext}
              disabled={currentIndex === imageCount - 1}
              aria-label="Next image"
            >
              <IconChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators (mobile) */}
      {hasMultipleImages && (
        <div className={styles.dots}>
          {imageUrls.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip (desktop) */}
      {hasMultipleImages && (
        <div className={styles.thumbnails}>
          {imageUrls.map((url, index) => (
            <button
              key={index}
              className={`${styles.thumbnail} ${index === currentIndex ? styles.thumbnailActive : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`View image ${index + 1}`}
            >
              <img
                src={url}
                alt={`${alt} thumbnail ${index + 1}`}
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
