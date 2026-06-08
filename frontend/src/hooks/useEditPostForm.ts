/**
 * useEditPostForm - Form logic for editing an existing listing.
 *
 * Mirrors useCreatePostForm but initializes from an existing post and manages
 * a mix of existing (already-uploaded) and newly added images so the seller can
 * reorder, remove, and add images. On submit it uploads any new files via
 * presigned URLs and sends the final ordered `image_urls` list to the update
 * endpoint.
 */

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { updatePost } from "@/api/posts";
import { uploadImages } from "@/api/uploads";
import { MAX_LISTING_PRICE, MIN_LISTING_PRICE } from "@/constants/listing";
import { queryKeys } from "@/hooks/queryKeys";
import { notifySuccess, notifyError } from "@/utils/notify";
import { getErrorMessage } from "@/utils/error";
import type {
  Post,
  PostType,
  Measurements,
  UpdatePostRequest,
} from "@/api/types/post";
import { getSizesForType, MEASUREMENT_FIELDS } from "@/api/types/post";
import type {
  CreatePostFormValues,
  ExtraMeasurement,
  MeasurementField,
  SelectOption,
} from "@/hooks/useCreatePostForm";
import { MAX_IMAGES } from "@/hooks/useCreatePostForm";

type ImageSlot =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

/** Reverse the create-form slug ("total_length" -> "total length"). */
function keyToLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function buildInitialMeasurements(post: Post): {
  known: Measurements;
  extra: ExtraMeasurement[];
} {
  const known: Record<string, number> = {};
  const extra: ExtraMeasurement[] = [];
  const fieldKeys = new Set(
    (MEASUREMENT_FIELDS[post.type] ?? []).map((f) => f.key),
  );

  let counter = 0;
  for (const [key, value] of Object.entries(post.measurements ?? {})) {
    if (value === undefined || value === null) continue;
    if (fieldKeys.has(key)) {
      known[key] = value as number;
    } else {
      extra.push({
        id: String(++counter),
        label: keyToLabel(key),
        value: String(value),
      });
    }
  }
  return { known: known as Measurements, extra };
}

function buildInitialSlots(post: Post): ImageSlot[] {
  const urls =
    post.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];
  return urls.map((url) => ({ kind: "existing", url }));
}

export function useEditPostForm(post: Post) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation("listings");

  const postTypeOptions = useMemo<SelectOption[]>(
    () => [
      { value: "SHIRT", label: t("categories.shirt") },
      { value: "PANTS", label: t("categories.pants") },
      { value: "JACKET", label: t("categories.jacket") },
      { value: "SHOES", label: t("categories.shoes") },
      { value: "ACCESSORIES", label: t("categories.accessories") },
      { value: "OTHER", label: t("categories.other") },
    ],
    [t],
  );

  const form = useForm<CreatePostFormValues>({
    validateInputOnBlur: true,
    initialValues: {
      title: post.title,
      description: post.description,
      type: post.type,
      price: parseFloat(post.price),
      shippingCost: parseFloat(post.shipping_cost),
      size: post.size,
    },
    validate: {
      title: (value) =>
        value.trim().length < 1 ? t("create.form.titleRequired") : null,
      description: (value) =>
        value.trim().length < 1 ? t("create.form.descriptionRequired") : null,
      type: (value) => (!value ? t("create.form.categoryRequired") : null),
      price: (value) => {
        if (!value || value < MIN_LISTING_PRICE)
          return t("create.form.priceMin", { min: MIN_LISTING_PRICE });
        if (value > MAX_LISTING_PRICE)
          return t("create.form.priceMax", {
            max: MAX_LISTING_PRICE.toLocaleString(),
          });
        return null;
      },
      size: (value, values) =>
        values.type && !value ? t("create.form.sizeRequired") : null,
    },
  });

  // Image slots (existing + new), initialized from the post.
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(() =>
    buildInitialSlots(post),
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Measurements
  const initial = useMemo(() => buildInitialMeasurements(post), [post]);
  const extraIdCounter = useRef(initial.extra.length);
  const [measurements, setMeasurements] = useState<Measurements>(initial.known);
  const [measurementsOpen, { toggle: toggleMeasurements }] = useDisclosure(
    initial.extra.length > 0 || Object.keys(initial.known as object).length > 0,
  );
  const [extraMeasurements, setExtraMeasurements] = useState<
    ExtraMeasurement[]
  >(initial.extra);
  const [measurementError, setMeasurementError] = useState<string | null>(null);

  const sizeOptions = useMemo<SelectOption[]>(() => {
    if (!form.values.type) return [];
    const sizes = getSizesForType(form.values.type);
    return sizes.map((s) => {
      if (form.values.type === "SHOES") {
        return { value: s, label: `EU ${s}` };
      }
      return { value: s, label: s };
    });
  }, [form.values.type]);

  const handleTypeChange = useCallback(
    (value: string | null) => {
      form.setFieldValue("type", value as PostType | null);
      form.setFieldValue("size", null);
      setMeasurements({});
      setExtraMeasurements([]);
    },
    [form],
  );

  const measurementFields = useMemo<MeasurementField[]>(() => {
    if (!form.values.type) return [];
    return (MEASUREMENT_FIELDS[form.values.type] ?? []).map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [form.values.type, t]);

  const imagePreviews = useMemo(
    () =>
      imageSlots.map((slot) =>
        slot.kind === "existing" ? slot.url : slot.previewUrl,
      ),
    [imageSlots],
  );

  const slotsRef = useRef(imageSlots);
  useEffect(() => {
    slotsRef.current = imageSlots;
  }, [imageSlots]);
  useEffect(() => {
    return () => {
      slotsRef.current.forEach((slot) => {
        if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
      });
    };
  }, []);

  const mutation = useMutation({
    // Upload any new images directly to storage, then send the final ordered
    // list of URLs (existing kept in place, new ones uploaded) as JSON.
    mutationFn: async (vars: {
      data: Omit<UpdatePostRequest, "image_urls">;
      slots: ImageSlot[];
    }) => {
      const newFiles: File[] = [];
      for (const slot of vars.slots) {
        if (slot.kind === "new") newFiles.push(slot.file);
      }
      const uploaded = await uploadImages(newFiles);
      let next = 0;
      const image_urls = vars.slots.map((slot) =>
        slot.kind === "existing" ? slot.url : uploaded[next++],
      );
      return updatePost(post.id, { ...vars.data, image_urls });
    },
    onSuccess: () => {
      notifySuccess(t("edit.success"));
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(post.id),
      });
      navigate({
        to: "/explore/$postId",
        params: { postId: String(post.id) },
      });
    },
    onError: (err) => {
      notifyError(getErrorMessage(err, t("edit.error")));
    },
  });

  // Image handlers. Object URLs are created here (once per file), outside the
  // state updater, so the updater stays pure and StrictMode can't double-create.
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
        setImageSlots((prev) => [...prev, ...added]);
      }
    },
    [t],
  );

  const handleRemoveImage = useCallback((index: number) => {
    // Revoke in the handler (once), not inside the pure state updater.
    const removed = slotsRef.current[index];
    if (removed?.kind === "new") URL.revokeObjectURL(removed.previewUrl);
    setImageSlots((prev) => prev.filter((_, i) => i !== index));
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
    setImageSlots((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSelectedImageIndex(to);
  }, []);

  // Measurement handlers (identical to create)
  const handleMeasurementChange = useCallback((key: string, value: string) => {
    const numValue = parseFloat(value);
    setMeasurements((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? undefined : numValue,
    }));
  }, []);

  const handleAddExtraMeasurement = useCallback(() => {
    setExtraMeasurements((prev) => [
      ...prev,
      { id: String(++extraIdCounter.current), label: "", value: "" },
    ]);
  }, []);

  const handleExtraMeasurementChange = useCallback(
    (index: number, field: "label" | "value", newValue: string) => {
      setExtraMeasurements((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: newValue };
        return updated;
      });
    },
    [],
  );

  const handleRemoveExtraMeasurement = useCallback((index: number) => {
    setExtraMeasurements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    (values: CreatePostFormValues) => {
      setMeasurementError(null);

      const cleanMeasurements = Object.fromEntries(
        Object.entries(measurements).filter(
          ([, v]) => v !== undefined && v !== null,
        ),
      ) as Measurements;

      const allMeasurements = { ...cleanMeasurements } as Record<
        string,
        number | undefined
      >;
      const seenKeys = new Set(Object.keys(cleanMeasurements));

      for (const extra of extraMeasurements) {
        if (extra.label && extra.value) {
          const key = extra.label.trim().toLowerCase().replace(/\s+/g, "_");
          const numValue = parseFloat(extra.value);

          if (!key || isNaN(numValue)) continue;

          if (seenKeys.has(key)) {
            setMeasurementError(
              t("create.form.duplicateMeasurement", {
                label: extra.label.trim(),
              }),
            );
            return;
          }

          seenKeys.add(key);
          allMeasurements[key] = numValue;
        }
      }

      const finalMeasurements =
        Object.keys(allMeasurements).length > 0
          ? (allMeasurements as Measurements)
          : undefined;

      mutation.mutate({
        data: {
          title: values.title,
          description: values.description,
          type: values.type!,
          price: values.price as number,
          shipping_cost: (values.shippingCost as number) || 0,
          size: values.size!,
          measurements: finalMeasurements,
        },
        slots: imageSlots,
      });
    },
    [measurements, extraMeasurements, imageSlots, mutation, t],
  );

  return {
    // Form
    form,
    postTypeOptions,
    sizeOptions,
    handleTypeChange,

    // Images
    imageCount: imageSlots.length,
    imagePreviews,
    selectedImageIndex,
    maxImages: MAX_IMAGES,
    handleAddImages,
    handleRemoveImage,
    handleSelectImage,
    handleMoveImage,

    // Measurements
    measurements,
    measurementFields,
    measurementsOpen,
    toggleMeasurements,
    extraMeasurements,
    measurementError,
    handleMeasurementChange,
    handleAddExtraMeasurement,
    handleExtraMeasurementChange,
    handleRemoveExtraMeasurement,

    // Submission
    handleSubmit,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
