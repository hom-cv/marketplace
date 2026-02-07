import { useEffect, useMemo } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
import { useTranslation } from "react-i18next";
import { useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import styles from "./Auth.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const { token } = useAuthStore();
  const { t } = useTranslation("auth");
  const routerState = useRouterState();

  const registered = useMemo(() => {
    const searchParams = new URLSearchParams(routerState.location.searchStr);
    return searchParams.get("registered") === "true";
  }, [routerState.location.searchStr]);

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
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t("validation.invalidEmail"),
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
    <Box className={styles.page}>
      <Box className={styles.container}>
        <Box className={styles.header}>
          <Title order={1} className={styles.title}>
            {t("login.title")}
          </Title>
          <Text size="sm" className={styles.subtitle}>
            {t("login.noAccount")}{" "}
            <Anchor component={Link} to="/sign-up" className={styles.link}>
              {t("login.signUpLink")}
            </Anchor>
          </Text>
        </Box>

        <Box className={styles.card}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              {registered && (
                <Alert
                  color="green"
                  title={t("login.registrationSuccess")}
                  radius="xs"
                >
                  {t("login.registrationSuccessMessage")}
                </Alert>
              )}
              {loginMutation.isError && (
                <Alert color="red" title={t("login.failed")} radius="xs">
                  {loginMutation.error?.message ||
                    t("login.invalidCredentials")}
                </Alert>
              )}
              <TextInput
                label={t("login.email")}
                placeholder={t("login.emailPlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label={t("login.password")}
                placeholder={t("login.passwordPlaceholder")}
                required
                radius="xs"
                {...form.getInputProps("password")}
              />
              <Button
                type="submit"
                fullWidth
                mt="md"
                loading={loginMutation.isPending}
              >
                {t("login.submit")}
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
