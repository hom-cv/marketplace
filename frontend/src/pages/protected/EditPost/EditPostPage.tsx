/**
 * EditPostPage - Edit an existing listing.
 *
 * Reuses the create-listing form components but is driven by useEditPostForm,
 * which initializes from the existing post and supports mixed existing/new
 * image reordering. Only the owner may edit, and sold listings are locked.
 */

import { Stack, Loader } from "@mantine/core";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { usePost } from "@/hooks/usePosts";
import { useEditPostForm } from "@/hooks/useEditPostForm";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import type { Post } from "@/api/types/post";
import {
  ImageUploadSection,
  ListingDetailsForm,
  MeasurementsSection,
  ListingSidebar,
} from "../CreatePost/components";
import styles from "../CreatePost/CreatePostPage.module.css";

function EditPostForm({ post }: { post: Post }) {
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");

  const {
    form,
    postTypeOptions,
    sizeOptions,
    handleTypeChange,
    imageCount,
    imagePreviews,
    selectedImageIndex,
    maxImages,
    handleAddImages,
    handleRemoveImage,
    handleSelectImage,
    handleMoveImage,
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
  } = useEditPostForm(post);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("edit.title")}</h1>
          <p className={styles.subtitle}>{t("edit.subtitle")}</p>
        </header>

        {measurementError && (
          <Alert variant="error" title={tCommon("status.error")} margin="bottom">
            {measurementError}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <div className={styles.layout}>
            <div className={styles.imageColumn}>
              <ImageUploadSection
                imageCount={imageCount}
                imagePreviews={imagePreviews}
                selectedImageIndex={selectedImageIndex}
                maxImages={maxImages}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onSelectImage={handleSelectImage}
                onMoveImage={handleMoveImage}
              />
            </div>

            <Stack gap={24} className={styles.detailsColumn}>
              <div className={styles.formCard}>
                <ListingDetailsForm
                  form={form}
                  postTypeOptions={postTypeOptions}
                  sizeOptions={sizeOptions}
                  onTypeChange={handleTypeChange}
                />
              </div>

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

              <ListingSidebar
                price={form.values.price}
                shippingCost={form.values.shippingCost}
                isPending={isPending}
                isFormValid={form.isValid()}
                submitLabel={t("edit.form.submit")}
                submittingLabel={t("edit.form.submitting")}
                helperText={t("edit.form.saveHint")}
              />
            </Stack>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditPostPage() {
  const { t } = useTranslation("listings");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const parsedId = params.postId ? Number(params.postId) : NaN;
  const postId = Number.isInteger(parsedId) ? parsedId : null;
  const currentUser = useAuthStore((state) => state.user);

  const { data: post, isLoading, error } = usePost(postId);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Alert variant="error" title={tCommon("status.error")}>
            {error instanceof Error ? error.message : t("view.failedToLoad")}
          </Alert>
        </div>
      </div>
    );
  }

  // Only the owner may edit.
  if (currentUser?.id !== post.user.id) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Alert variant="error" title={tCommon("status.error")}>
            {t("edit.notOwner")}
          </Alert>
        </div>
      </div>
    );
  }

  // Sold listings are locked from editing.
  if (post.is_sold) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Alert variant="warning" title={tCommon("badges.sold")}>
            {t("edit.soldLocked")}
          </Alert>
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/account/listings" })}
          >
            {t("edit.backToListings")}
          </Button>
        </div>
      </div>
    );
  }

  return <EditPostForm post={post} />;
}
