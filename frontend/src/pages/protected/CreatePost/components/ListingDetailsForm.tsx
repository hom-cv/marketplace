/**
 * ListingDetailsForm - Form fields with editorial section labels
 * Typography-forward design with generous spacing
 */

import { useMemo } from "react";
import {
  TextInput,
  Textarea,
  Select,
  TagsInput,
  NumberInput,
  Stack,
  SimpleGrid,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { useBrands } from "@/hooks/useBrands";
import {
  MAX_LISTING_PRICE,
  MAX_SHIPPING_COST,
  MIN_LISTING_PRICE,
  MIN_SHIPPING_COST,
  MAX_TAGS_PER_POST,
  MAX_TAG_LENGTH,
  CATCHALL_BRAND_SLUG,
} from "@/constants/listing";
import type {
  CreatePostFormValues,
  SelectOption,
} from "@/api/types/listingForm";
import formStyles from "@/styles/forms.module.css";
import styles from "./ListingDetailsForm.module.css";

interface ListingDetailsFormProps {
  form: UseFormReturnType<CreatePostFormValues>;
  postTypeOptions: SelectOption[];
  genderOptions: SelectOption[];
  sizeOptions: SelectOption[];
  onTypeChange: (value: string | null) => void;
  onGenderChange: (value: string | null) => void;
}

export function ListingDetailsForm({
  form,
  postTypeOptions,
  genderOptions,
  sizeOptions,
  onTypeChange,
  onGenderChange,
}: ListingDetailsFormProps) {
  const { t } = useTranslation("listings");
  const { data: brands } = useBrands();

  const brandOptions = useMemo(
    () => [
      { value: CATCHALL_BRAND_SLUG, label: t("create.form.brandOther") },
      ...(brands ?? [])
        .filter((b) => b.slug !== CATCHALL_BRAND_SLUG)
        .map((b) => ({ value: b.slug, label: b.name })),
    ],
    [brands, t],
  );

  return (
    <Stack gap={28}>
      {/* Item Info Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionLabel}>{t("create.sections.itemInfo")}</h3>
        <Stack gap="md">
          <TextInput
            label={t("create.form.titleLabel")}
            placeholder={t("create.form.titlePlaceholder")}
            maxLength={200}
            required
            radius="xs"
            {...form.getInputProps("title")}
          />
          <Textarea
            label={t("create.form.description")}
            placeholder={t("create.form.descriptionPlaceholder")}
            maxLength={5000}
            minRows={4}
            required
            radius="xs"
            {...form.getInputProps("description")}
          />
        </Stack>
      </div>

      {/* Classification Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionLabel}>
          {t("create.sections.classification")}
        </h3>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Select
            label={t("create.form.category")}
            placeholder={t("create.form.categoryPlaceholder")}
            data={postTypeOptions}
            required
            radius="xs"
            value={form.values.type}
            onChange={onTypeChange}
            error={form.errors.type}
          />
          <Select
            label={t("create.form.gender")}
            placeholder={t("create.form.genderPlaceholder")}
            data={genderOptions}
            required
            radius="xs"
            value={form.values.gender}
            onChange={onGenderChange}
            error={form.errors.gender}
          />
          <Select
            label={t("create.form.brand")}
            placeholder={t("create.form.brandPlaceholder")}
            data={brandOptions}
            searchable
            clearable
            radius="xs"
            renderOption={({ option }) => (
              <div>
                <div>{option.label}</div>
                {option.value === CATCHALL_BRAND_SLUG && (
                  <div className={styles.brandOptionHint}>
                    {t("create.form.brandOtherHint")}
                  </div>
                )}
              </div>
            )}
            {...form.getInputProps("brand")}
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
        </SimpleGrid>
        <TagsInput
          mt="md"
          label={t("create.form.tags")}
          placeholder={t("create.form.tagsPlaceholder")}
          description={t("create.form.tagsHint")}
          maxTags={MAX_TAGS_PER_POST}
          maxLength={MAX_TAG_LENGTH}
          radius="xs"
          {...form.getInputProps("tags")}
        />
      </div>

      {/* Pricing Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionLabel}>{t("create.sections.pricing")}</h3>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label={t("create.form.price")}
            placeholder={`${MIN_LISTING_PRICE}.00`}
            min={MIN_LISTING_PRICE}
            max={MAX_LISTING_PRICE}
            decimalScale={2}
            required
            radius="xs"
            clampBehavior="none"
            rightSection={<span className={formStyles.unit}>฿</span>}
            {...form.getInputProps("price")}
          />
          <div className={styles.fieldWithHint}>
            <NumberInput
              label={t("create.form.shippingCost")}
              placeholder="0.00"
              min={MIN_SHIPPING_COST}
              max={MAX_SHIPPING_COST}
              decimalScale={2}
              radius="xs"
              rightSection={<span className={formStyles.unit}>฿</span>}
              {...form.getInputProps("shippingCost")}
            />
            <span className={styles.fieldHint}>
              {t("create.form.shippingDescription")}
            </span>
          </div>
        </SimpleGrid>
      </div>
    </Stack>
  );
}
