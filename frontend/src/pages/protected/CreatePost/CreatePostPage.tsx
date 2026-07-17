/**
 * CreatePostPage - Editorial redesign for creating listings
 * Magazine-inspired layout with asymmetric two-column design
 */

import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { Alert } from "@/components/Alert";
import { useCreatePostForm } from "@/hooks/useCreatePostForm";
import {
  NotSellerGate,
  ImageUploadSection,
  ListingDetailsForm,
  MeasurementsSection,
  ListingSidebar,
} from "./components";
import styles from "./CreatePostPage.module.css";

export function CreatePostPage() {
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  const {
    form,
    categoryOptions,
    subcategoryOptions,
    genderOptions,
    sizeOptions,
    handleGenderChange,
    handleCategoryChange,
    handleSubcategoryChange,
    imageCount,
    imagePreviews,
    selectedImageIndex,
    maxImages,
    handleAddImages,
    handleRemoveImage,
    handleSelectImage,
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
    handleSubmit,
    isPending,
  } = useCreatePostForm();

  // Non-seller gate
  if (!user?.is_seller) {
    return <NotSellerGate />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Editorial Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>{t("create.title")}</h1>
          <p className={styles.subtitle}>{t("create.subtitle")}</p>
        </header>

        {measurementError && (
          <Alert
            variant="error"
            title={tCommon("status.error")}
            margin="bottom"
          >
            {measurementError}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          {/* Main Content Area */}
          <div className={styles.layout}>
            {/* Left Column: Image Section */}
            <div className={styles.imageColumn}>
              <ImageUploadSection
                imageCount={imageCount}
                imagePreviews={imagePreviews}
                selectedImageIndex={selectedImageIndex}
                maxImages={maxImages}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onSelectImage={handleSelectImage}
              />
            </div>

            {/* Right Column: Details + Sidebar */}
            <Stack gap={24} className={styles.detailsColumn}>
              {/* Form Card */}
              <div className={styles.formCard}>
                <ListingDetailsForm
                  form={form}
                  categoryOptions={categoryOptions}
                  subcategoryOptions={subcategoryOptions}
                  genderOptions={genderOptions}
                  sizeOptions={sizeOptions}
                  onCategoryChange={handleCategoryChange}
                  onSubcategoryChange={handleSubcategoryChange}
                  onGenderChange={handleGenderChange}
                />
              </div>

              {/* Measurements Section */}
              <MeasurementsSection
                isOpen={measurementsOpen}
                onToggle={toggleMeasurements}
                measurements={measurements}
                measurementFields={measurementFields}
                extraMeasurements={extraMeasurements}
                onMeasurementChange={handleMeasurementChange}
                onAddExtraMeasurement={handleAddExtraMeasurement}
                onExtraMeasurementChange={handleExtraMeasurementChange}
                onRemoveExtraMeasurement={handleRemoveExtraMeasurement}
              />

              {/* Sidebar with earnings + publish */}
              <ListingSidebar
                price={form.values.price}
                shippingCost={form.values.shippingCost}
                isPending={isPending}
                isFormValid={form.isValid()}
              />
            </Stack>
          </div>
        </form>
      </div>
    </div>
  );
}
