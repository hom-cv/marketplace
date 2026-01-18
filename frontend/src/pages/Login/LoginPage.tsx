import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { AuthFormPage } from "@/components/AuthFormPage";
import { FormError } from "@/components/FormError";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const { token } = useAuthStore();
  const { t } = useTranslation("auth");

  useEffect(() => {
    if (token) {
      navigate({ to: "/app" });
    }
  }, [token, navigate]);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t("validation.invalidEmail")),
      password: (value) =>
        value.length >= 6 ? null : t("validation.passwordMin6"),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    loginMutation.mutate(
      { email: values.email, password: values.password },
      {
        onSuccess: () => {
          navigate({ to: "/app" });
        },
      },
    );
  };

  return (
    <AuthFormPage
      title={t("login.title")}
      footer={
        <Text size="sm" c="dimmed">
          {t("login.noAccount")}{" "}
          <Anchor component={Link} to="/sign-up" fw={500}>
            {t("login.signUpLink")}
          </Anchor>
        </Text>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {loginMutation.isError && (
            <FormError
              message={loginMutation.error?.message || t("login.invalidCredentials")}
            />
          )}
          <TextInput
            label={t("login.email")}
            placeholder={t("login.emailPlaceholder")}
            size="md"
            required
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label={t("login.password")}
            placeholder={t("login.passwordPlaceholder")}
            size="md"
            required
            {...form.getInputProps("password")}
          />
          <Button
            type="submit"
            fullWidth
            size="md"
            mt="xs"
            loading={loginMutation.isPending}
          >
            {t("login.submit")}
          </Button>
        </Stack>
      </form>
    </AuthFormPage>
  );
}
