/**
 * Profile edit page - Flat design
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea, Switch, Button, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { updateMyProfile } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/utils/error";
import { Alert } from "@/components/Alert";
import type { UpdateProfileRequest } from "@/api/types/user";
import styles from "./ProfileEditPage.module.css";

export function ProfileEditPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<UpdateProfileRequest>({
    initialValues: {
      bio: user?.bio ?? "",
      show_full_name: user?.show_full_name ?? true,
    },
    validate: {
      bio: (value) =>
        value && value.length > 500 ? t("validation.bioTooLong") : null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      if (user?.username) {
        queryClient.invalidateQueries({
          queryKey: ["userProfile", user.username],
        });
      }
    },
  });

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
                radius="xs"
                loading={updateMutation.isPending}
              >
                {tCommon("buttons.save")}
              </Button>
            </Stack>
          </form>
        </div>
      </div>
    </div>
  );
}
