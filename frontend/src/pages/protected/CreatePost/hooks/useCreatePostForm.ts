/**
 * useCreatePostForm - Extracted form logic for CreatePostPage
 * Handles form state, image management, measurements, and submission
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { createPost } from "@/api/posts";
import type { PostType, Measurements } from "@/api/types/post";
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
      price: (value) =>
        !value || value <= 0 ? t("create.form.priceRequired") : null,
      size: (value, values) =>
        values.type && !value ? t("create.form.sizeRequired") : null,
    },
  });

  // Image state
  const [images, setImages] = useState<File[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Measurements state
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
    return MEASUREMENT_FIELDS[form.values.type].map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [form.values.type, t]);

  // Image previews with cleanup
  const imagePreviews = useMemo(() => {
    return images.map((file) => URL.createObjectURL(file));
  }, [images]);

  useEffect(() => {
    const urls = imagePreviews;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // Mutation
  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate({ to: "/account/listings" });
    },
  });

  // Image handlers
  const handleAddImages = useCallback((files: File[]) => {
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      setSelectedImageIndex((currentIndex) => {
        const newLength = filtered.length;
        if (newLength === 0) return 0;
        if (index < currentIndex) return currentIndex - 1;
        if (index === currentIndex)
          return Math.min(currentIndex, newLength - 1);
        return currentIndex;
      });
      return filtered;
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
      { id: crypto.randomUUID(), label: "", value: "" },
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
        title: values.title,
        description: values.description,
        type: values.type!,
        price: values.price as number,
        shipping_cost: (values.shippingCost as number) || 0,
        size: values.size!,
        measurements: finalMeasurements,
        images: images.length > 0 ? images : undefined,
      });
    },
    [measurements, extraMeasurements, images, mutation, t],
  );

  return {
    // Form
    form,
    postTypeOptions,
    sizeOptions,
    handleTypeChange,

    // Images
    images,
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
