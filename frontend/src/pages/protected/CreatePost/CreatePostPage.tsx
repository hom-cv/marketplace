/**
 * Create Post Page - Form to create a new marketplace listing
 * Flat design matching site style
 */

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconX,
  IconBuildingStore,
  IconRuler,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
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
    [t]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PostType | null>(null);
  const [price, setPrice] = useState<string>("");
  const [shippingCost, setShippingCost] = useState<string>("0");
  const [size, setSize] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [images, setImages] = useState<File[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [measurementsOpen, { toggle: toggleMeasurements }] =
    useDisclosure(false);
  const [extraMeasurements, setExtraMeasurements] = useState<
    Array<{ label: string; value: string }>
  >([]);

  // Get available sizes based on selected category
  const sizeOptions = useMemo(() => {
    if (!type) return [];
    const sizes = getSizesForType(type);
    return sizes.map((s) => {
      if (type === "SHOES") {
        return { value: s, label: `EU ${s}` };
      }
      return { value: s, label: s };
    });
  }, [type]);

  // Reset size when type changes
  useEffect(() => {
    setSize(null);
    setMeasurements({});
    setExtraMeasurements([]);
  }, [type]);

  // Get measurement fields based on category
  const measurementFields = useMemo(() => {
    if (!type) return [];
    return MEASUREMENT_FIELDS[type].map((field) => ({
      key: field.key,
      label: t(`measurements.${field.translationKey}`),
    }));
  }, [type, t]);

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
    setExtraMeasurements((prev) => [...prev, { label: "", value: "" }]);
  };

  const handleExtraMeasurementChange = (
    index: number,
    field: "label" | "value",
    newValue: string
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMeasurementError(null);

    const priceNum = parseFloat(price);
    if (!title || !description || !type || !priceNum || !size) return;

    const cleanMeasurements = Object.fromEntries(
      Object.entries(measurements).filter(
        ([, v]) => v !== undefined && v !== null
      )
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
            t("create.form.duplicateMeasurement", { label: extra.label.trim() })
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
      title,
      description,
      type,
      price: priceNum,
      shipping_cost: parseFloat(shippingCost) || 0,
      size,
      measurements: finalMeasurements,
      images: images.length > 0 ? images : undefined,
    });
  };

  const isValid =
    title && description && type && parseFloat(price) > 0 && size;

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
            <Button
              variant="primary"
              size="lg"
              leftIcon={<IconBuildingStore size={18} />}
              onClick={() => navigate({ to: "/account/become-seller" })}
            >
              {t("seller.becomeSeller")}
            </Button>
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

        <form onSubmit={handleSubmit}>
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
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={[
                      styles.thumbnail,
                      index === selectedImageIndex && styles.thumbnailActive,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={imagePreviews[index]}
                      alt={`Thumbnail ${index + 1}`}
                    />
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
                <div className={styles.formRow}>
                  {/* Title */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      {t("create.form.titleLabel")}
                      <span className={styles.fieldRequired}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      placeholder={t("create.form.titlePlaceholder")}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                    />
                  </div>

                  {/* Description */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      {t("create.form.description")}
                      <span className={styles.fieldRequired}>*</span>
                    </label>
                    <textarea
                      className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                      placeholder={t("create.form.descriptionPlaceholder")}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={5000}
                    />
                  </div>

                  {/* Category & Size */}
                  <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        {t("create.form.category")}
                        <span className={styles.fieldRequired}>*</span>
                      </label>
                      <select
                        className={`${styles.fieldInput} ${styles.fieldSelect}`}
                        value={type || ""}
                        onChange={(e) => setType(e.target.value as PostType)}
                      >
                        <option value="">
                          {t("create.form.categoryPlaceholder")}
                        </option>
                        {postTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        {t("create.form.size")}
                        <span className={styles.fieldRequired}>*</span>
                      </label>
                      <select
                        className={`${styles.fieldInput} ${styles.fieldSelect}`}
                        value={size || ""}
                        onChange={(e) => setSize(e.target.value || null)}
                        disabled={!type}
                      >
                        <option value="">
                          {t("create.form.sizePlaceholder")}
                        </option>
                        {sizeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price & Shipping */}
                  <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        {t("create.form.price")}
                        <span className={styles.fieldRequired}>*</span>
                      </label>
                      <input
                        type="number"
                        className={styles.fieldInput}
                        placeholder="0.00"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>
                        {t("create.form.shippingCost")}
                      </label>
                      <input
                        type="number"
                        className={styles.fieldInput}
                        placeholder="0.00"
                        min="0"
                        max="10000"
                        step="0.01"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                      />
                      <span className={styles.fieldDescription}>
                        {t("create.form.shippingDescription")}
                      </span>
                    </div>
                  </div>

                  {/* Optional Measurements Section */}
                  {measurementFields.length > 0 && (
                    <div>
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
                                      e.target.value
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
                                  key={index}
                                  className={styles.extraMeasurementRow}
                                >
                                  <input
                                    type="text"
                                    className={styles.extraMeasurementLabel}
                                    placeholder={t(
                                      "create.form.measurementLabel"
                                    )}
                                    value={extra.label}
                                    onChange={(e) =>
                                      handleExtraMeasurementChange(
                                        index,
                                        "label",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <input
                                    type="number"
                                    className={styles.extraMeasurementValue}
                                    placeholder="cm"
                                    min="0"
                                    step="0.1"
                                    value={extra.value}
                                    onChange={(e) =>
                                      handleExtraMeasurementChange(
                                        index,
                                        "value",
                                        e.target.value
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
              {parseFloat(price) > 0 && (
                <EarningsPreview
                  itemPrice={parseFloat(price)}
                  shippingCost={parseFloat(shippingCost) || 0}
                />
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!isValid || mutation.isPending}
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
