/**
 * Shared core for the create/edit listing forms: fields + validation, category/
 * size options, and the image/measurement hooks. Create vs edit differ only in
 * the injected options (initial values, submit, success message/navigation).
 */

import { useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { MAX_LISTING_PRICE, MIN_LISTING_PRICE } from "@/constants/listing";
import { notifySuccess, notifyError } from "@/utils/notify";
import { getErrorMessage } from "@/utils/error";
import type { Post, PostType, CreatePostRequest } from "@/api/types/post";
import { getSizesForType, formatSize, MEASUREMENT_FIELDS } from "@/api/types/post";
import { useListingImages } from "@/hooks/useListingImages";
import { useListingMeasurements } from "@/hooks/useListingMeasurements";

export interface CreatePostFormValues {
  title: string;
  description: string;
  type: PostType | null;
  price: number | "";
  shippingCost: number | "";
  size: string | null;
}

export interface MeasurementField {
  key: string;
  label: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Listing payload sans image URLs (added at submit time). */
export type ListingData = Omit<CreatePostRequest, "image_urls">;

interface UseListingFormOptions {
  post?: Post;
  initialValues: CreatePostFormValues;
  submit: (data: CreatePostRequest) => Promise<Post>;
  successMessage: string;
  errorFallback: string;
  onSuccess: (post: Post) => void;
}

function initialImageUrls(post?: Post): string[] {
  if (!post) return [];
  if (post.image_urls && post.image_urls.length > 0) return post.image_urls;
  return post.image_url ? [post.image_url] : [];
}

export function useListingForm({
  post,
  initialValues,
  submit,
  successMessage,
  errorFallback,
  onSuccess,
}: UseListingFormOptions) {
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
    initialValues,
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

  const images = useListingImages(initialImageUrls(post));
  const measurements = useListingMeasurements(post);

  const sizeOptions = useMemo<SelectOption[]>(() => {
    const type = form.values.type;
    if (!type) return [];
    return getSizesForType(type).map((s) => ({
      value: s,
      label: formatSize(s, type),
    }));
  }, [form.values.type]);

  const handleTypeChange = useCallback(
    (value: string | null) => {
      form.setFieldValue("type", value as PostType | null);
      form.setFieldValue("size", null);
      measurements.reset();
    },
    [form, measurements],
  );

  const measurementFields = useMemo<MeasurementField[]>(() => {
    if (!form.values.type) return [];
    return (MEASUREMENT_FIELDS[form.values.type] ?? []).map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [form.values.type, t]);

  const mutation = useMutation({
    mutationFn: async (data: ListingData) => {
      const image_urls = await images.resolveImageUrls();
      return submit({ ...data, image_urls });
    },
    onSuccess: (saved) => {
      notifySuccess(successMessage);
      onSuccess(saved);
    },
    onError: (err) => {
      notifyError(getErrorMessage(err, errorFallback));
    },
  });

  const handleSubmit = useCallback(
    (values: CreatePostFormValues) => {
      const result = measurements.assemble();
      if (!result.ok) return;

      mutation.mutate({
        title: values.title,
        description: values.description,
        type: values.type!,
        price: values.price as number,
        shipping_cost: (values.shippingCost as number) || 0,
        size: values.size!,
        measurements: result.measurements,
      });
    },
    [measurements, mutation],
  );

  return {
    // Form
    form,
    postTypeOptions,
    sizeOptions,
    handleTypeChange,

    // Images
    imageCount: images.imageCount,
    imagePreviews: images.imagePreviews,
    selectedImageIndex: images.selectedImageIndex,
    maxImages: images.maxImages,
    handleAddImages: images.handleAddImages,
    handleRemoveImage: images.handleRemoveImage,
    handleSelectImage: images.handleSelectImage,
    handleMoveImage: images.handleMoveImage,

    // Measurements
    measurements: measurements.measurements,
    measurementFields,
    measurementsOpen: measurements.measurementsOpen,
    toggleMeasurements: measurements.toggleMeasurements,
    extraMeasurements: measurements.extraMeasurements,
    measurementError: measurements.measurementError,
    handleMeasurementChange: measurements.handleMeasurementChange,
    handleAddExtraMeasurement: measurements.handleAddExtraMeasurement,
    handleExtraMeasurementChange: measurements.handleExtraMeasurementChange,
    handleRemoveExtraMeasurement: measurements.handleRemoveExtraMeasurement,

    // Submission
    handleSubmit,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
