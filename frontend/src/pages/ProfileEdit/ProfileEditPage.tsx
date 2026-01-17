/**
 * Profile edit page for updating bio and privacy settings
 */

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setError(null);
      setSuccess(t("messages.profileUpdated"));
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      if (user?.username) {
        queryClient.invalidateQueries({
          queryKey: ["userProfile", user.username],
        });
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
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

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title={tCommon("status.error")} color="red" mb="lg">
          {error}
        </Alert>
      )}

      {success && (
        <Alert icon={<IconCheck size={16} />} title={tCommon("status.success")} color="green" mb="lg">
          {success}
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
            checked={form.values.show_full_name}
            onChange={(event) =>
              form.setFieldValue("show_full_name", event.currentTarget.checked)
            }
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            mt="md"
            loading={updateMutation.isPending}
          >
            {tCommon("actions.save")}
          </Button>
        </Stack>
      </form>
    </Container>
  );
}

