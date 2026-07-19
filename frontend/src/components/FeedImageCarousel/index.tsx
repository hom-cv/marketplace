/**
 * FeedImageCarousel - full-bleed, swipeable image carousel for the mobile feed.
 * Owns the swipe gesture, dot indicators, and the Instagram double-tap-to-like
 * (auth gate + heart-pop). The shared `like` action is passed in so the card's
 * footer heart stays in sync from one `useLike` instance. Overlay `children`
 * (badges) are drawn on top of the frame.
 */

import { useEffect, useRef, useState } from "react";
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
  const [heartPopKey, setHeartPopKey] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const movedRef = useRef(false); // committed to a horizontal swipe this gesture
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef(0);

  const hasMultiple = images.length > 1;
  const lastIndex = images.length - 1;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !hasMultiple) return;

    const onMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      let dx = e.touches[0].clientX - startXRef.current;
      const dy = e.touches[0].clientY - startYRef.current;

      if (!movedRef.current) {
        // Direction not decided yet: a mostly-vertical move releases the gesture
        // so the page scrolls naturally.
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > TAP_SLOP) {
          draggingRef.current = false;
          setDragging(false);
          setDragOffset(0);
          return;
        }
        if (Math.abs(dx) > TAP_SLOP) movedRef.current = true;
      }
      if (!movedRef.current) return;

      // Committed horizontal — lock out vertical scroll for the whole gesture.
      e.preventDefault();
      const i = indexRef.current;
      if ((i === 0 && dx > 0) || (i === lastIndex && dx < 0)) dx *= 0.3;
      dxRef.current = dx;
      setDragOffset(dx);
    };

    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [hasMultiple, lastIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    suppressClickRef.current = false; // clear any stale flag from a prior gesture
    if (!hasMultiple) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dxRef.current = 0;
    movedRef.current = false;
    draggingRef.current = true;
    setDragging(true);
  };

  const handleTouchEnd = () => {
    if (draggingRef.current && movedRef.current) {
      const dx = dxRef.current;
      if (dx <= -SWIPE_THRESHOLD && index < lastIndex) setIndex(index + 1);
      else if (dx >= SWIPE_THRESHOLD && index > 0) setIndex(index - 1);
      suppressClickRef.current = true; // don't tap after a swipe
    }
    draggingRef.current = false;
    setDragging(false);
    setDragOffset(0);
  };

  const handleDoubleTap = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    onLike();
    setHeartPopKey((prev) => prev + 1); // remount the heart-pop icon to replay it
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
      ref={wrapRef}
      className={styles.wrap}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
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
