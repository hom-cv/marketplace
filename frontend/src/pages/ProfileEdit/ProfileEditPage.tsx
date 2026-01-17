/**
 * Profile edit page for updating bio and privacy settings
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Title,
  Text,
  Stack,
  Textarea,
  Switch,
  Button,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { updateMyProfile } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";
import type { UpdateProfileRequest } from "@/api/types/user";

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
    <Container size="lg" my={40}>
      <Title order={2} mb="xs">
        {t("edit.title")}
      </Title>
      <Text c="dimmed" mb="xl">
        {t("edit.subtitle")}
      </Text>

      {updateMutation.isError && (
        <Alert icon={<IconAlertCircle size={16} />} title={tCommon("status.error")} color="red" mb="lg">
          {updateMutation.error instanceof Error ? updateMutation.error.message : tCommon("errors.generic")}
        </Alert>
      )}

      {updateMutation.isSuccess && (
        <Alert icon={<IconCheck size={16} />} title={tCommon("status.success")} color="green" mb="lg">
          {t("messages.profileUpdated")}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Textarea
            label={t("edit.bioLabel")}
            description={t("edit.bioDescription")}
            placeholder={t("edit.bioPlaceholder")}
            minRows={4}
            maxRows={8}
            maxLength={500}
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
            mt="md"
            loading={updateMutation.isPending}
          >
            {tCommon("buttons.save")}
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
