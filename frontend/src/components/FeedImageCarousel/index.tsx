/**
 * FeedImageCarousel - full-bleed, swipeable image carousel for the mobile feed.
 * Owns the swipe gesture, dot indicators, and the Instagram double-tap-to-like
 * (auth gate + heart-pop). The shared `like` action is passed in so the card's
 * footer heart stays in sync from one `useLike` instance. Overlay `children`
 * (badges) are drawn on top of the frame.
 */

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box } from "@mantine/core";
import { IconHeartFilled } from "@tabler/icons-react";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import styles from "./FeedImageCarousel.module.css";

const DOUBLE_TAP_MS = 300;
const SWIPE_THRESHOLD = 50; // px of horizontal travel to change slide
const TAP_SLOP = 10; // movement under this still counts as a tap, not a swipe

interface FeedImageCarouselProps {
  images: string[];
  alt: string;
  isAuthenticated: boolean;
  /** Shared like action (always likes, never unlikes) — from the card's useLike. */
  onLike: () => void;
  /** Called instead of liking when the viewer isn't signed in. */
  onAuthRequired: () => void;
  /** Overlays drawn on top of the frame (badges, etc.). */
  children?: ReactNode;
}

export function FeedImageCarousel({
  images,
  alt,
  isAuthenticated,
  onLike,
  onAuthRequired,
  children,
}: FeedImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // px, live finger travel
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef(0);
  const [heartPopKey, setHeartPopKey] = useState(0);

  const hasMultiple = images.length > 1;

  const handleDoubleTap = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    onLike();
    setHeartPopKey((prev) => prev + 1); // remount the heart-pop icon to replay it
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    suppressClickRef.current = false; // clear any stale flag from a prior gesture
    if (!hasMultiple) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dxRef.current = 0;
    movedRef.current = false;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    let dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Before committing to a horizontal swipe, bail out on a mostly-vertical
    // gesture so the page scrolls naturally (and the tap still registers).
    if (!movedRef.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > TAP_SLOP) {
      setDragging(false);
      setDragOffset(0);
      return;
    }
    if (Math.abs(dx) > TAP_SLOP) movedRef.current = true;
    // Resist dragging past the first/last slide.
    if ((index === 0 && dx > 0) || (index === images.length - 1 && dx < 0)) {
      dx *= 0.3;
    }
    dxRef.current = dx;
    setDragOffset(dx);
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    const dx = dxRef.current;
    if (dx <= -SWIPE_THRESHOLD && index < images.length - 1) setIndex(index + 1);
    else if (dx >= SWIPE_THRESHOLD && index > 0) setIndex(index - 1);
    if (movedRef.current) suppressClickRef.current = true; // don't tap after a swipe
    setDragging(false);
    setDragOffset(0);
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      handleDoubleTap();
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <Box
      className={styles.wrap}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {images.length > 0 ? (
        <div
          className={`${styles.track} ${dragging ? styles.dragging : ""}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))` }}
        >
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${alt} ${i + 1}`}
              loading="lazy"
              draggable={false}
              className={styles.image}
            />
          ))}
        </div>
      ) : (
        <ImagePlaceholder iconSize={64} />
      )}
      {hasMultiple && (
        <div className={styles.dots}>
          {images.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
            />
          ))}
        </div>
      )}
      {heartPopKey > 0 && (
        <IconHeartFilled key={heartPopKey} size={96} className={styles.heartPop} />
      )}
      {children}
    </Box>
  );
}
