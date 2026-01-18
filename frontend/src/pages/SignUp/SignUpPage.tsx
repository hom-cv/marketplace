import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Anchor,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Trans, useTranslation } from "react-i18next";
import { useRegisterMutation, useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { AuthFormPage } from "@/components/AuthFormPage";
import { FormError } from "@/components/FormError";

export function SignUpPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
  const { token, setToken, setUser } = useAuthStore();
  const { t } = useTranslation("auth");

  useEffect(() => {
    if (token) {
      navigate({ to: "/app" });
    }
  }, [token, navigate]);

  const form = useForm({
    initialValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      username: (value) =>
        value.trim().length > 0 ? null : t("validation.usernameRequired"),
      firstName: (value) =>
        value.trim().length > 0 ? null : t("validation.firstNameRequired"),
      lastName: (value) =>
        value.trim().length > 0 ? null : t("validation.lastNameRequired"),
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t("validation.invalidEmail"),
      password: (value) =>
        value.length >= 8 ? null : t("validation.passwordMin8"),
      confirmPassword: (value, values) =>
        value === values.password ? null : t("validation.passwordsNoMatch"),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    registerMutation.mutate(
      {
        username: values.username,
        first_name: values.firstName,
        last_name: values.lastName,
        email_address: values.email,
        password: values.password,
      },
      {
        onSuccess: (user) => {
          loginMutation.mutate(
            { email: values.email, password: values.password },
            {
              onSuccess: (loginResponse) => {
                setToken(loginResponse.access_token);
                setUser(user);
                navigate({ to: "/verify-email", search: { token: undefined } });
              },
              onError: () => {
                navigate({ to: "/login" });
              },
            },
          );
        },
      },
    );
  };

  return (
    <AuthFormPage
      title={t("signup.title")}
      maxWidth={420}
      footer={
        <Text size="sm" c="dimmed">
          {t("signup.hasAccount")}{" "}
          <Anchor component={Link} to="/login" fw={500}>
            {t("signup.signInLink")}
          </Anchor>
        </Text>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {registerMutation.isError && (
            <FormError
              message={registerMutation.error?.message || t("signup.couldNotCreate")}
            />
          )}

          <TextInput
            label={t("signup.username")}
            placeholder={t("signup.usernamePlaceholder")}
            size="md"
            required
            {...form.getInputProps("username")}
          />

          <SimpleGrid cols={2} spacing="md">
            <TextInput
              label={t("signup.firstName")}
              placeholder={t("signup.firstNamePlaceholder")}
              size="md"
              required
              {...form.getInputProps("firstName")}
            />
            <TextInput
              label={t("signup.lastName")}
              placeholder={t("signup.lastNamePlaceholder")}
              size="md"
              required
              {...form.getInputProps("lastName")}
            />
          </SimpleGrid>

          <TextInput
            label={t("signup.email")}
            placeholder={t("signup.emailPlaceholder")}
            size="md"
            required
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label={t("signup.password")}
            placeholder={t("signup.passwordPlaceholder")}
            size="md"
            required
            {...form.getInputProps("password")}
          />

          <PasswordInput
            label={t("signup.confirmPassword")}
            placeholder={t("signup.confirmPasswordPlaceholder")}
            size="md"
            required
            {...form.getInputProps("confirmPassword")}
          />

          <Button
            type="submit"
            fullWidth
            size="md"
            mt="xs"
            loading={registerMutation.isPending}
          >
            {t("signup.submit")}
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            <Trans
              i18nKey="signup.policyAcceptance"
              ns="policies"
              components={{
                termsLink: (
                  <Anchor
                    component={Link}
                    to="/terms"
                    size="xs"
                  />
                ),
                privacyLink: (
                  <Anchor
                    component={Link}
                    to="/privacy"
                    size="xs"
                  />
                ),
              }}
            />
          </Text>
        </Stack>
      </form>
    </AuthFormPage>
  );
}
