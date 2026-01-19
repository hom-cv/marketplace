import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Trans, useTranslation } from "react-i18next";
import { useRegisterMutation, useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

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
          // Auto-login after successful registration
          loginMutation.mutate(
            { email: values.email, password: values.password },
            {
              onSuccess: (loginResponse) => {
                setToken(loginResponse.access_token);
                setUser(user);
                navigate({ to: "/verify-email", search: { token: undefined } });
              },
              onError: () => {
                // If auto-login fails, redirect to login page
                navigate({ to: "/login" });
              },
            },
          );
        },
      },
    );
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">{t("signup.title")}</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {t("signup.hasAccount")}{" "}
        <Link to="/login" style={{ color: "var(--mantine-color-blue-6)" }}>
          {t("signup.signInLink")}
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {registerMutation.isError && (
              <Alert color="red" title={t("signup.failed")}>
                {registerMutation.error?.message || t("signup.couldNotCreate")}
              </Alert>
            )}
            <TextInput
              label={t("signup.username")}
              placeholder={t("signup.usernamePlaceholder")}
              required
              {...form.getInputProps("username")}
            />
            <TextInput
              label={t("signup.firstName")}
              placeholder={t("signup.firstNamePlaceholder")}
              required
              {...form.getInputProps("firstName")}
            />
            <TextInput
              label={t("signup.lastName")}
              placeholder={t("signup.lastNamePlaceholder")}
              required
              {...form.getInputProps("lastName")}
            />
            <TextInput
              label={t("signup.email")}
              placeholder={t("signup.emailPlaceholder")}
              required
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label={t("signup.password")}
              placeholder={t("signup.passwordPlaceholder")}
              required
              {...form.getInputProps("password")}
            />
            <PasswordInput
              label={t("signup.confirmPassword")}
              placeholder={t("signup.confirmPasswordPlaceholder")}
              required
              {...form.getInputProps("confirmPassword")}
            />
            <Button
              type="submit"
              fullWidth
              mt="md"
              loading={registerMutation.isPending}
            >
              {t("signup.submit")}
            </Button>

            {/* Policy acceptance text - at bottom of form */}
            <Text size="xs" c="dimmed" ta="center">
              <Trans
                i18nKey="signup.policyAcceptance"
                ns="policies"
                components={{
                  termsLink: (
                    <Anchor
                      component={Link}
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                    />
                  ),
                  privacyLink: (
                    <Anchor
                      component={Link}
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                    />
                  ),
                }}
              />
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
