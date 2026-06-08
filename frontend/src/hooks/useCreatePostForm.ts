/**
 * useCreatePostForm - Extracted form logic for CreatePostPage
 * Handles form state, image management, measurements, and submission
 */

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { createPost } from "@/api/posts";
import { uploadImages } from "@/api/uploads";
import { MAX_LISTING_PRICE, MIN_LISTING_PRICE } from "@/constants/listing";
import { queryKeys } from "@/hooks/queryKeys";
import { notifySuccess, notifyError } from "@/utils/notify";
import { getErrorMessage } from "@/utils/error";
import type {
  PostType,
  Measurements,
  CreatePostRequest,
} from "@/api/types/post";
import { getSizesForType, MEASUREMENT_FIELDS } from "@/api/types/post";

/** Maximum number of images allowed per listing */
export const MAX_IMAGES = 5;

export interface CreatePostFormValues {
  title: string;
  description: string;
  type: PostType | null;
  price: number | "";
  shippingCost: number | "";
  size: string | null;
}

export interface ExtraMeasurement {
  id: string;
  label: string;
  value: string;
}

export interface MeasurementField {
  key: string;
  label: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export function useCreatePostForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation("listings");

  // Category options with translations
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

  // Form state using Mantine useForm
  const form = useForm<CreatePostFormValues>({
    validateInputOnBlur: true,
    initialValues: {
      title: "",
      description: "",
      type: null,
      price: "",
      shippingCost: 0,
      size: null,
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

  // Image state: each item pairs the file with a stable object URL created
  // once at add time (so reorder/select never recreate URLs).
  const [imageItems, setImageItems] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Measurements state
  const extraIdCounter = useRef(0);
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [measurementsOpen, { toggle: toggleMeasurements }] =
    useDisclosure(false);
  const [extraMeasurements, setExtraMeasurements] = useState<
    ExtraMeasurement[]
  >([]);
  const [measurementError, setMeasurementError] = useState<string | null>(null);

  // Get available sizes based on selected category
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

  // Handle category type change - resets dependent fields
  const handleTypeChange = useCallback(
    (value: string | null) => {
      form.setFieldValue("type", value as PostType | null);
      form.setFieldValue("size", null);
      setMeasurements({});
      setExtraMeasurements([]);
    },
    [form],
  );

  // Get measurement fields based on category
  const measurementFields = useMemo<MeasurementField[]>(() => {
    if (!form.values.type) return [];
    return (MEASUREMENT_FIELDS[form.values.type] ?? []).map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [form.values.type, t]);

  // Pure mapping; URLs are created once in handleAddImages and revoked on
  // removal/unmount — never recreated here.
  const imagePreviews = useMemo(
    () => imageItems.map((item) => item.previewUrl),
    [imageItems],
  );

  // Track current items so the unmount cleanup can revoke their URLs.
  const itemsRef = useRef(imageItems);
  useEffect(() => {
    itemsRef.current = imageItems;
  }, [imageItems]);
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  // Mutation: upload images directly to storage, then create the listing.
  const mutation = useMutation({
    mutationFn: async (vars: {
      data: Omit<CreatePostRequest, "image_urls">;
      images: File[];
    }) => {
      const image_urls = await uploadImages(vars.images);
      return createPost({ ...vars.data, image_urls });
    },
    onSuccess: () => {
      notifySuccess(t("create.success"));
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      navigate({ to: "/account/listings" });
    },
    onError: (err) => {
      notifyError(getErrorMessage(err, t("create.error")));
    },
  });

  // Image handlers. Object URLs are created here (once per file), outside the
  // state updater, so the updater stays pure and StrictMode can't double-create.
  const handleAddImages = useCallback(
    (files: File[]) => {
      const available = MAX_IMAGES - itemsRef.current.length;
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
          file,
          previewUrl: URL.createObjectURL(file),
        }));
        setImageItems((prev) => [...prev, ...added]);
      }
    },
    [t],
  );

  const handleRemoveImage = useCallback((index: number) => {
    // Revoke in the handler (once), not inside the pure state updater.
    const removed = itemsRef.current[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    setImageItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedImageIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  }, []);

  const handleSelectImage = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  // Measurement handlers
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

  // Submit handler
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
        images: imageItems.map((item) => item.file),
      });
    },
    [measurements, extraMeasurements, imageItems, mutation, t],
  );

  return {
    // Form
    form,
    postTypeOptions,
    sizeOptions,
    handleTypeChange,

    // Images
    imageCount: imageItems.length,
    imagePreviews,
    selectedImageIndex,
    maxImages: MAX_IMAGES,
    handleAddImages,
    handleRemoveImage,
    handleSelectImage,

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
