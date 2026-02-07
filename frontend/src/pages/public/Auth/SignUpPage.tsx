import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  TextInput,
  PasswordInput,
  Button,
  Box,
  Title,
  Text,
  Stack,
  Alert,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Trans, useTranslation } from "react-i18next";
import { useRegisterMutation, useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import styles from "./Auth.module.css";

export function SignUpPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
  const { token, setUser } = useAuthStore();
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

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const user = await registerMutation.mutateAsync({
        username: values.username,
        first_name: values.firstName,
        last_name: values.lastName,
        email_address: values.email,
        password: values.password,
      });

      try {
        await loginMutation.mutateAsync({
          email: values.email,
          password: values.password,
        });
        setUser(user);
        navigate({ to: "/verify-email", search: { token: undefined } });
      } catch {
        // Auto-login failed, redirect to login page
        navigate({ to: "/login", search: { registered: true } });
      }
    } catch {
      // Registration error is handled by registerMutation.isError
    }
  };

  return (
    <Box className={styles.page}>
      <Box className={styles.container}>
        <Box className={styles.header}>
          <Title order={1} className={styles.title}>
            {t("signup.title")}
          </Title>
          <Text size="sm" className={styles.subtitle}>
            {t("signup.hasAccount")}{" "}
            <Anchor component={Link} to="/login" className={styles.link}>
              {t("signup.signInLink")}
            </Anchor>
          </Text>
        </Box>

        <Box className={styles.card}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              {registerMutation.isError && (
                <Alert color="red" title={t("signup.failed")} radius="xs">
                  {registerMutation.error?.message || t("signup.couldNotCreate")}
                </Alert>
              )}
              <TextInput
                label={t("signup.username")}
                placeholder={t("signup.usernamePlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("username")}
              />
              <TextInput
                label={t("signup.firstName")}
                placeholder={t("signup.firstNamePlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("firstName")}
              />
              <TextInput
                label={t("signup.lastName")}
                placeholder={t("signup.lastNamePlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("lastName")}
              />
              <TextInput
                label={t("signup.email")}
                placeholder={t("signup.emailPlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label={t("signup.password")}
                placeholder={t("signup.passwordPlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("password")}
              />
              <PasswordInput
                label={t("signup.confirmPassword")}
                placeholder={t("signup.confirmPasswordPlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("confirmPassword")}
              />
              <Button
                type="submit"
                fullWidth
                mt="sm"
                loading={registerMutation.isPending}
              >
                {t("signup.submit")}
              </Button>

              <Text size="xs" ta="center" className={styles.policy}>
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
        </Box>
      </Box>
    </Box>
  );
}
