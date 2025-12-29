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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { useLoginMutation } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

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
    <Container size={420} my={40}>
      <Title ta="center">{t("login.title")}</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {t("login.noAccount")}{" "}
        <Link to="/sign-up" style={{ color: "var(--mantine-color-blue-6)" }}>
          {t("login.signUpLink")}
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {loginMutation.isError && (
              <Alert color="red" title={t("login.failed")}>
                {loginMutation.error?.message || t("login.invalidCredentials")}
              </Alert>
            )}
            <TextInput
              label={t("login.email")}
              placeholder={t("login.emailPlaceholder")}
              required
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label={t("login.password")}
              placeholder={t("login.passwordPlaceholder")}
              required
              {...form.getInputProps("password")}
            />
            <Button
              type="submit"
              fullWidth
              mt="xl"
              loading={loginMutation.isPending}
            >
              {t("login.submit")}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
