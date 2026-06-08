/**
 * Shared image state for the listing forms. Slots are existing URLs or new
 * files; `resolveImageUrls()` uploads the new ones and returns the final order.
 */

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { uploadImages } from "@/api/uploads";

/** Maximum number of images allowed per listing. */
export const MAX_IMAGES = 5;

type ImageSlot =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

export function useListingImages(initialUrls: string[] = []) {
  const { t } = useTranslation("listings");

  const [slots, setSlots] = useState<ImageSlot[]>(() =>
    initialUrls.map((url) => ({ kind: "existing", url })),
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const imagePreviews = useMemo(
    () => slots.map((s) => (s.kind === "existing" ? s.url : s.previewUrl)),
    [slots],
  );

  // Latest slots for handlers/cleanup (avoids stale closures).
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);
  useEffect(() => {
    return () => {
      slotsRef.current.forEach((s) => {
        if (s.kind === "new") URL.revokeObjectURL(s.previewUrl);
      });
    };
  }, []);

  // Create object URLs outside the updater (keeps it pure / StrictMode-safe).
  const handleAddImages = useCallback(
    (files: File[]) => {
      const available = MAX_IMAGES - slotsRef.current.length;
      const accepted = files.slice(0, Math.max(0, available));
      const rejected = files.length - accepted.length;

      if (rejected > 0) {
        notifications.show({
          message: t("images.limitExceeded", { max: MAX_IMAGES, rejected }),
          color: "orange",
        });
      }

      if (accepted.length > 0) {
        const added = accepted.map((file) => ({
          kind: "new" as const,
          file,
          previewUrl: URL.createObjectURL(file),
        }));
        setSlots((prev) => [...prev, ...added]);
      }
    },
    [t],
  );

  const handleRemoveImage = useCallback((index: number) => {
    const removed = slotsRef.current[index];
    if (removed?.kind === "new") URL.revokeObjectURL(removed.previewUrl);
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setSelectedImageIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  }, []);

  const handleSelectImage = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleMoveImage = useCallback((from: number, to: number) => {
    setSlots((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSelectedImageIndex(to);
  }, []);

  /** Upload new files and return the final ordered list of public image URLs. */
  const resolveImageUrls = useCallback(async (): Promise<string[]> => {
    const current = slotsRef.current;
    const newFiles = current
      .filter((s): s is Extract<ImageSlot, { kind: "new" }> => s.kind === "new")
      .map((s) => s.file);
    const uploaded = await uploadImages(newFiles);
    let next = 0;
    return current.map((s) => (s.kind === "existing" ? s.url : uploaded[next++]));
  }, []);

  return {
    imageCount: slots.length,
    imagePreviews,
    selectedImageIndex,
    maxImages: MAX_IMAGES,
    handleAddImages,
    handleRemoveImage,
    handleSelectImage,
    handleMoveImage,
    resolveImageUrls,
  };
}
