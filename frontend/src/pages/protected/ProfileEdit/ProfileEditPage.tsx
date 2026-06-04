/**
 * Profile edit page - Flat design
 */

import { TextInput, Textarea, Switch, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useUpdateProfileMutation } from "@/hooks/useUsers";
import { getErrorMessage } from "@/utils/error";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import type { UpdateProfileRequest } from "@/api/types/user";
import styles from "./ProfileEditPage.module.css";

export function ProfileEditPage() {
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");

  const user = useAuthStore((state) => state.user);

  const form = useForm<UpdateProfileRequest>({
    initialValues: {
      username: user?.username ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      bio: user?.bio ?? "",
      show_full_name: user?.show_full_name ?? true,
    },
    validate: {
      username: (value) => {
        const v = value ?? "";
        if (v.length < 3 || v.length > 64)
          return t("validation.usernameLength");
        if (!/^[a-zA-Z0-9_]+$/.test(v)) return t("validation.usernameInvalid");
        return null;
      },
      first_name: (value) => {
        const v = (value ?? "").trim();
        if (!v) return t("validation.firstNameRequired");
        if (v.length > 64) return t("validation.nameTooLong");
        return null;
      },
      last_name: (value) =>
        (value ?? "").trim().length > 64 ? t("validation.nameTooLong") : null,
      bio: (value) =>
        value && value.length > 500 ? t("validation.bioTooLong") : null,
    },
  });

  const updateMutation = useUpdateProfileMutation();

  const handleSubmit = (values: UpdateProfileRequest) => {
    updateMutation.mutate(values);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("edit.title")}</h1>
          <p className={styles.subtitle}>{t("edit.subtitle")}</p>
        </div>

        {updateMutation.isError && (
          <Alert variant="error" title={tCommon("status.error")} margin="bottom">
            {getErrorMessage(updateMutation.error, tCommon("errors.generic"))}
          </Alert>
        )}

        {updateMutation.isSuccess && (
          <Alert variant="success" title={tCommon("status.success")} margin="bottom">
            {t("messages.profileUpdated")}
          </Alert>
        )}

        <div className={styles.card}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              <TextInput
                label={t("edit.usernameLabel")}
                description={t("edit.usernameDescription")}
                placeholder={t("edit.usernamePlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("username")}
              />

              <TextInput
                label={t("edit.firstNameLabel")}
                placeholder={t("edit.firstNamePlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("first_name")}
              />

              <TextInput
                label={t("edit.lastNameLabel")}
                placeholder={t("edit.lastNamePlaceholder")}
                radius="xs"
                {...form.getInputProps("last_name")}
              />

              <Textarea
                label={t("edit.bioLabel")}
                description={t("edit.bioDescription")}
                placeholder={t("edit.bioPlaceholder")}
                minRows={4}
                maxRows={8}
                maxLength={500}
                radius="xs"
                {...form.getInputProps("bio")}
              />

              <Switch
                label={t("edit.showNameLabel")}
                description={t("edit.showNameDescription")}
                {...form.getInputProps("show_full_name", { type: "checkbox" })}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? tCommon("status.loading") : tCommon("buttons.save")}
              </Button>
            </Stack>
          </form>
        </div>
      </div>
    </div>
  );
}
