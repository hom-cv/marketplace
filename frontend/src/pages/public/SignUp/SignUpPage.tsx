/**
 * Sign Up Page - Clean & Minimal design
 * Features: Centered form with logo, password strength indicator
 */

import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  Anchor,
  Progress,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconLock, IconUser, IconAt, IconShoppingBag } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { useRegisterMutation, useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import styles from "./SignUpPage.module.css";

// Password strength calculation
function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) strength += 25;
  return strength;
}

function getStrengthColor(strength: number): string {
  if (strength < 50) return "red";
  if (strength < 75) return "yellow";
  return "green";
}

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

  const passwordStrength = getPasswordStrength(form.values.password);

  return (
    <div className={styles.wrapper}>
      <div className={styles.formContainer}>
        {/* Header with Logo */}
        <div className={styles.header}>
          <div className={styles.logoIcon}>
            <IconShoppingBag size={20} />
          </div>
          <Title className={styles.title}>{t("signup.title")}</Title>
          <Text size="sm" className={styles.subtitle}>
            {t("signup.hasAccount")}{" "}
            <Link to="/login" className={styles.link}>
              {t("signup.signInLink")}
            </Link>
          </Text>
        </div>

        {/* Form Card */}
        <Paper radius="md" p="lg" withBorder className={styles.formCard}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              {registerMutation.isError && (
                <Alert color="red" title={t("signup.failed")} radius="md">
                  {registerMutation.error?.message || t("signup.couldNotCreate")}
                </Alert>
              )}

              <TextInput
                label={t("signup.username")}
                placeholder={t("signup.usernamePlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconAt size={16} />}
                {...form.getInputProps("username")}
              />

              <TextInput
                label={t("signup.firstName")}
                placeholder={t("signup.firstNamePlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconUser size={16} />}
                {...form.getInputProps("firstName")}
              />
              <TextInput
                label={t("signup.lastName")}
                placeholder={t("signup.lastNamePlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconUser size={16} />}
                {...form.getInputProps("lastName")}
              />

              <TextInput
                label={t("signup.email")}
                placeholder={t("signup.emailPlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconMail size={16} />}
                {...form.getInputProps("email")}
              />

              <div>
                <PasswordInput
                  label={t("signup.password")}
                  placeholder={t("signup.passwordPlaceholder")}
                  required
                  size="sm"
                  radius="md"
                  leftSection={<IconLock size={16} />}
                  {...form.getInputProps("password")}
                />
                {form.values.password && (
                  <Progress
                    value={passwordStrength}
                    color={getStrengthColor(passwordStrength)}
                    size="xs"
                    mt="xs"
                    radius="md"
                  />
                )}
              </div>

              <PasswordInput
                label={t("signup.confirmPassword")}
                placeholder={t("signup.confirmPasswordPlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconLock size={16} />}
                {...form.getInputProps("confirmPassword")}
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                loading={registerMutation.isPending}
                className={styles.submitButton}
              >
                {t("signup.submit")}
              </Button>

              {/* Policy acceptance text */}
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
      </div>
    </div>
  );
}
