/**
 * Create Post Page - Form to create a new marketplace listing
 * Flat design matching site style
 */

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileButton,
  TextInput,
  Textarea,
  Select,
  NumberInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconX,
  IconBuildingStore,
  IconRuler,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { createPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EarningsPreview } from "@/components/EarningsPreview";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { getErrorMessage } from "@/utils/error";

import type { PostType, Measurements } from "@/api/types/post";
import { getSizesForType, MEASUREMENT_FIELDS } from "@/api/types/post";
import styles from "./CreatePostPage.module.css";

interface CreatePostFormValues {
  title: string;
  description: string;
  type: PostType | null;
  price: number | "";
  shippingCost: number | "";
  size: string | null;
}

export function CreatePostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation("listings");

  // Category options with translations
  const postTypeOptions = useMemo(
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

  const [measurements, setMeasurements] = useState<Measurements>({});
  const [images, setImages] = useState<File[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [measurementsOpen, { toggle: toggleMeasurements }] =
    useDisclosure(false);
  const [extraMeasurements, setExtraMeasurements] = useState<
    Array<{ id: string; label: string; value: string }>
  >([]);

  // Get available sizes based on selected category
  const sizeOptions = useMemo(() => {
    if (!form.values.type) return [];
    const sizes = getSizesForType(form.values.type);
    return sizes.map((s) => {
      if (form.values.type === "SHOES") {
        return { value: s, label: `EU ${s}` };
      }
      return { value: s, label: s };
    });
  }, [form.values.type]);

  // Reset size when type changes
  useEffect(() => {
    form.setFieldValue("size", null);
    setMeasurements({});
    setExtraMeasurements([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.type]);

  // Get measurement fields based on category
  const measurementFields = useMemo(() => {
    if (!form.values.type) return [];
    return MEASUREMENT_FIELDS[form.values.type].map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [form.values.type, t]);

  const imagePreviews = useMemo(() => {
    return images.map((file) => URL.createObjectURL(file));
  }, [images]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate({ to: "/account/listings" });
    },
  });

  const handleAddImages = (files: File[]) => {
    setImages((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedImageIndex >= images.length - 1) {
      setSelectedImageIndex(Math.max(0, images.length - 2));
    }
  };

  const handleMeasurementChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    setMeasurements((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const handleAddExtraMeasurement = () => {
    setExtraMeasurements((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  };

  const handleExtraMeasurementChange = (
    index: number,
    field: "label" | "value",
    newValue: string,
  ) => {
    setExtraMeasurements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: newValue };
      return updated;
    });
  };

  const handleRemoveExtraMeasurement = (index: number) => {
    setExtraMeasurements((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation for duplicate measurement labels
  const [measurementError, setMeasurementError] = useState<string | null>(null);

  const handleSubmit = (values: CreatePostFormValues) => {
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
  };

  // Check if user is a verified seller
  if (!user?.is_seller) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Card padding="lg" className={styles.notSellerCard}>
            <div className={styles.notSellerIcon}>
              <IconBuildingStore size={32} />
            </div>
            <h2 className={styles.notSellerTitle}>
              {t("seller.verificationRequired")}
            </h2>
            <p className={styles.notSellerText}>
              {t("seller.verificationMessage")}
            </p>
            <Link
              to="/account/become-seller"
              className={styles.becomeSellerLink}
            >
              <Button
                variant="primary"
                size="lg"
                leftIcon={<IconBuildingStore size={18} />}
              >
                {t("seller.becomeSeller")}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{t("create.title")}</h1>
          <p className={styles.subtitle}>{t("create.subtitle")}</p>
        </div>

        {/* Alerts */}
        {mutation.error && (
          <Alert variant="error" title="Error" margin="bottom">
            {getErrorMessage(mutation.error, t("create.error"))}
          </Alert>
        )}

        {measurementError && (
          <Alert variant="error" title="Error" margin="bottom">
            {measurementError}
          </Alert>
        )}

        {mutation.isSuccess && (
          <Alert variant="success" title="Success" margin="bottom">
            {t("create.success")}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <div className={styles.layout}>
            {/* Left: Image Preview */}
            <div className={styles.imageSection}>
              <div className={styles.mainImageWrapper}>
                {images.length > 0 ? (
                  <img
                    src={imagePreviews[selectedImageIndex]}
                    alt="Preview"
                    className={styles.mainImage}
                  />
                ) : (
                  <ImagePlaceholder text={t("images.noImages")} />
                )}
              </div>

              <div className={styles.thumbnailRow}>
                {imagePreviews.map((previewUrl, index) => (
                  <div
                    key={previewUrl}
                    className={[
                      styles.thumbnail,
                      index === selectedImageIndex && styles.thumbnailActive,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={previewUrl} alt={`Thumbnail ${index + 1}`} />
                    {index === 0 && (
                      <span className={styles.coverBadge}>
                        {t("images.cover")}
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.thumbnailRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(index);
                      }}
                    >
                      <IconX size={10} />
                    </button>
                  </div>
                ))}

                <FileButton
                  onChange={(files) => files && handleAddImages(files)}
                  accept="image/*"
                  multiple
                >
                  {(props) => (
                    <button
                      type="button"
                      {...props}
                      className={styles.addImageButton}
                    >
                      <IconPlus size={20} />
                    </button>
                  )}
                </FileButton>
              </div>
            </div>

            {/* Right: Form */}
            <div className={styles.formSection}>
              <div className={styles.formCard}>
                <div className={styles.formFields}>
                  {/* Title */}
                  <TextInput
                    label={t("create.form.titleLabel")}
                    placeholder={t("create.form.titlePlaceholder")}
                    maxLength={200}
                    required
                    radius="xs"
                    {...form.getInputProps("title")}
                  />

                  {/* Description */}
                  <Textarea
                    label={t("create.form.description")}
                    placeholder={t("create.form.descriptionPlaceholder")}
                    maxLength={5000}
                    minRows={4}
                    required
                    radius="xs"
                    {...form.getInputProps("description")}
                  />

                  {/* Category & Size */}
                  <div className={styles.formGrid}>
                    <Select
                      label={t("create.form.category")}
                      placeholder={t("create.form.categoryPlaceholder")}
                      data={postTypeOptions}
                      required
                      radius="xs"
                      {...form.getInputProps("type")}
                    />

                    <Select
                      label={t("create.form.size")}
                      placeholder={t("create.form.sizePlaceholder")}
                      data={sizeOptions}
                      disabled={!form.values.type}
                      required
                      radius="xs"
                      {...form.getInputProps("size")}
                    />
                  </div>

                  {/* Price & Shipping */}
                  <div className={styles.formGrid}>
                    <NumberInput
                      label={t("create.form.price")}
                      placeholder="0.00"
                      min={0.01}
                      max={1000000}
                      decimalScale={2}
                      required
                      radius="xs"
                      {...form.getInputProps("price")}
                    />

                    <div>
                      <NumberInput
                        label={t("create.form.shippingCost")}
                        placeholder="0.00"
                        min={0}
                        max={10000}
                        decimalScale={2}
                        radius="xs"
                        {...form.getInputProps("shippingCost")}
                      />
                      <span className={styles.fieldHint}>
                        {t("create.form.shippingDescription")}
                      </span>
                    </div>
                  </div>

                  {/* Optional Measurements Section */}
                  {measurementFields.length > 0 && (
                    <div className={styles.measurementsSection}>
                      <button
                        type="button"
                        className={styles.measurementsToggle}
                        onClick={toggleMeasurements}
                      >
                        <IconRuler size={16} />
                        {t("create.form.addMeasurements")}
                        {measurementsOpen ? (
                          <IconChevronUp size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                      </button>

                      {measurementsOpen && (
                        <div className={styles.measurementsContent}>
                          <p className={styles.measurementsDescription}>
                            {t("create.form.measurementsDescription")}
                          </p>

                          <div className={styles.measurementsGrid}>
                            {measurementFields.map((field) => (
                              <div
                                key={field.key}
                                className={styles.measurementField}
                              >
                                <label className={styles.measurementLabel}>
                                  {field.label}
                                </label>
                                <input
                                  type="number"
                                  className={styles.measurementInput}
                                  placeholder="cm"
                                  min="0"
                                  step="0.1"
                                  value={
                                    (
                                      measurements as Record<
                                        string,
                                        number | undefined
                                      >
                                    )[field.key] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleMeasurementChange(
                                      field.key,
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>

                          {/* Extra Measurements */}
                          {extraMeasurements.length > 0 && (
                            <div className={styles.extraMeasurements}>
                              <p className={styles.extraMeasurementsLabel}>
                                {t("create.form.extraMeasurements")}
                              </p>
                              {extraMeasurements.map((extra, index) => (
                                <div
                                  key={extra.id}
                                  className={styles.extraMeasurementRow}
                                >
                                  <input
                                    type="text"
                                    className={`${styles.measurementInput} ${styles.extraMeasurementLabelInput}`}
                                    placeholder={t(
                                      "create.form.measurementLabel",
                                    )}
                                    value={extra.label}
                                    onChange={(e) =>
                                      handleExtraMeasurementChange(
                                        index,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <input
                                    type="number"
                                    className={`${styles.measurementInput} ${styles.extraMeasurementValueInput}`}
                                    placeholder="cm"
                                    min="0"
                                    step="0.1"
                                    value={extra.value}
                                    onChange={(e) =>
                                      handleExtraMeasurementChange(
                                        index,
                                        "value",
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    className={styles.extraMeasurementRemove}
                                    onClick={() =>
                                      handleRemoveExtraMeasurement(index)
                                    }
                                  >
                                    <IconX size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            className={styles.addMeasurementButton}
                            onClick={handleAddExtraMeasurement}
                          >
                            <IconPlus size={14} />
                            {t("create.form.addExtraMeasurement")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Earnings Preview */}
              {typeof form.values.price === "number" &&
                form.values.price > 0 && (
                  <EarningsPreview
                    itemPrice={form.values.price}
                    shippingCost={(form.values.shippingCost as number) || 0}
                  />
                )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!form.isValid() || mutation.isPending}
              >
                {mutation.isPending
                  ? t("create.form.submitting")
                  : t("create.form.submit")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
