/**
 * Shared core for the create/edit listing forms: fields + validation, category/
 * size options, and the image/measurement hooks. Create vs edit differ only in
 * the injected options (initial values, submit, success message/navigation).
 */

import { useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import {
  MAX_LISTING_PRICE,
  MIN_LISTING_PRICE,
  MAX_SHIPPING_COST,
  MIN_SHIPPING_COST,
  BRAND_OTHER_VALUE,
} from "@/constants/listing";
import { notifySuccess, notifyError } from "@/utils/notify";
import { getErrorMessage } from "@/utils/error";
import type {
  Post,
  PostCategory,
  Gender,
  CreatePostRequest,
} from "@/api/types/post";
import {
  getSizesForGroup,
  formatSize,
  sizeGroupFor,
  MEASUREMENT_FIELDS_BY_GROUP,
  POST_GENDERS,
} from "@/api/types/post";
import {
  useCategoryTree,
  categoriesForGender,
  subcategoriesFor,
} from "@/hooks/useCategoryTree";
import { getGenderLabels } from "@/constants/postGenders";
import { categoryLabel, subcategoryLabel } from "@/constants/postTypes";
import type {
  CreatePostFormValues,
  MeasurementField,
  SelectOption,
} from "@/api/types/listingForm";
import { useListingImages } from "@/hooks/useListingImages";
import { useListingMeasurements } from "@/hooks/useListingMeasurements";

/** Listing payload sans image URLs (added at submit time). */
type ListingData = Omit<CreatePostRequest, "image_urls">;

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
  const { data: taxonomy } = useCategoryTree();

  const genderOptions = useMemo<SelectOption[]>(() => {
    const labels = getGenderLabels(t);
    return POST_GENDERS.map((g) => ({ value: g, label: labels[g] }));
  }, [t]);

  const form = useForm<CreatePostFormValues>({
    validateInputOnBlur: true,
    initialValues,
    validate: {
      title: (value) =>
        value.trim().length < 1 ? t("create.form.titleRequired") : null,
      description: (value) =>
        value.trim().length < 1 ? t("create.form.descriptionRequired") : null,
      gender: (value) => (!value ? t("create.form.genderRequired") : null),
      category: (value) => (!value ? t("create.form.categoryRequired") : null),
      subcategory: (value) =>
        !value ? t("create.form.subcategoryRequired") : null,
      price: (value) => {
        if (!value || value < MIN_LISTING_PRICE)
          return t("create.form.priceMin", { min: MIN_LISTING_PRICE });
        if (value > MAX_LISTING_PRICE)
          return t("create.form.priceMax", {
            max: MAX_LISTING_PRICE.toLocaleString(),
          });
        return null;
      },
      shippingCost: (value) => {
        if (value === "") return null;
        if (value < MIN_SHIPPING_COST)
          return t("create.form.shippingMin", { min: MIN_SHIPPING_COST });
        if (value > MAX_SHIPPING_COST)
          return t("create.form.shippingMax", {
            max: MAX_SHIPPING_COST.toLocaleString(),
          });
        return null;
      },
      size: (value, values) =>
        values.subcategory && !value ? t("create.form.sizeRequired") : null,
    },
  });

  const images = useListingImages(initialImageUrls(post));
  const measurements = useListingMeasurements(post);
  const { reset: resetMeasurements, assemble: assembleMeasurements } =
    measurements;

  const { gender, category, subcategory } = form.values;

  // Gender-scoped category options (from the served taxonomy).
  const categoryOptions = useMemo<SelectOption[]>(() => {
    return categoriesForGender(taxonomy, gender).map((c) => ({
      value: c,
      label: categoryLabel(t, taxonomy, c),
    }));
  }, [taxonomy, gender, t]);

  const subcategoryOptions = useMemo<SelectOption[]>(() => {
    return subcategoriesFor(taxonomy, gender, category).map((s) => ({
      value: s,
      label: subcategoryLabel(t, taxonomy, s),
    }));
  }, [taxonomy, gender, category, t]);

  // Size + measurements derive from the subcategory's size group.
  const sizeGroup = useMemo(
    () => sizeGroupFor(taxonomy, category, subcategory),
    [taxonomy, category, subcategory],
  );

  const sizeOptions = useMemo<SelectOption[]>(() => {
    if (!subcategory) return [];
    return getSizesForGroup(sizeGroup).map((s) => ({
      value: s,
      label: formatSize(s, sizeGroup),
    }));
  }, [subcategory, sizeGroup]);

  // Changing gender invalidates the whole category path.
  const handleGenderChange = useCallback(
    (value: string | null) => {
      form.setFieldValue("gender", value as Gender | null);
      form.setFieldValue("category", null);
      form.setFieldValue("subcategory", null);
      form.setFieldValue("size", null);
      resetMeasurements();
    },
    [form, resetMeasurements],
  );

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      form.setFieldValue("category", value as PostCategory | null);
      form.setFieldValue("subcategory", null);
      form.setFieldValue("size", null);
      resetMeasurements();
    },
    [form, resetMeasurements],
  );

  // Size group can change with the subcategory, so reset size + measurements.
  const handleSubcategoryChange = useCallback(
    (value: string | null) => {
      form.setFieldValue("subcategory", value);
      const group = value ? sizeGroupFor(taxonomy, category, value) : null;
      form.setFieldValue("size", group === "ONE_SIZE" ? "ONE_SIZE" : null);
      resetMeasurements();
    },
    [form, resetMeasurements, taxonomy, category],
  );

  const measurementFields = useMemo<MeasurementField[]>(() => {
    if (!subcategory) return [];
    return (MEASUREMENT_FIELDS_BY_GROUP[sizeGroup] ?? []).map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [subcategory, sizeGroup, t]);

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

  const { mutate } = mutation;
  const handleSubmit = useCallback(
    (values: CreatePostFormValues) => {
      const result = assembleMeasurements();
      if (!result.ok) return;

      mutate({
        title: values.title,
        description: values.description,
        category: values.category!,
        subcategory: values.subcategory!,
        gender: values.gender!,
        brand:
          values.brand && values.brand !== BRAND_OTHER_VALUE
            ? values.brand
            : undefined,
        tags: values.tags,
        price: values.price as number,
        shipping_cost: (values.shippingCost as number) || 0,
        size: values.size!,
        measurements: result.measurements,
      });
    },
    [assembleMeasurements, mutate],
  );

  return {
    // Form
    form,
    categoryOptions,
    subcategoryOptions,
    genderOptions,
    sizeOptions,
    handleGenderChange,
    handleCategoryChange,
    handleSubcategoryChange,

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
