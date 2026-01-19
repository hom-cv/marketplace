/**
 * Login Page - Clean & Minimal design
 * Features: Centered form with logo, clean layout
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconLock, IconShoppingBag } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import styles from "./LoginPage.module.css";

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
    <div className={styles.wrapper}>
      <div className={styles.formContainer}>
        {/* Header with Logo */}
        <div className={styles.header}>
          <div className={styles.logoIcon}>
            <IconShoppingBag size={20} />
          </div>
          <Title className={styles.title}>{t("login.title")}</Title>
          <Text size="sm" className={styles.subtitle}>
            {t("login.noAccount")}{" "}
            <Link to="/sign-up" className={styles.link}>
              {t("login.signUpLink")}
            </Link>
          </Text>
        </div>

        {/* Form Card */}
        <Paper radius="md" p="lg" withBorder className={styles.formCard}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              {loginMutation.isError && (
                <Alert color="red" title={t("login.failed")} radius="md">
                  {loginMutation.error?.message || t("login.invalidCredentials")}
                </Alert>
              )}
              <TextInput
                label={t("login.email")}
                placeholder={t("login.emailPlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconMail size={16} />}
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label={t("login.password")}
                placeholder={t("login.passwordPlaceholder")}
                required
                size="sm"
                radius="md"
                leftSection={<IconLock size={16} />}
                {...form.getInputProps("password")}
              />
              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                loading={loginMutation.isPending}
                className={styles.submitButton}
              >
                {t("login.submit")}
              </Button>
            </Stack>
          </form>
        </Paper>
      </div>
    </div>
  );
}
