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
import { useRegisterMutation, useLoginMutation } from "../../hooks/useAuth";
import { useAuthStore } from "../../stores/authStore";

export function SignUpPage() {
    const navigate = useNavigate();
    const registerMutation = useRegisterMutation();
    const loginMutation = useLoginMutation();
    const { token, setToken, setUser } = useAuthStore();

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
                value.trim().length > 0 ? null : "Username is required",
            firstName: (value) =>
                value.trim().length > 0 ? null : "First name is required",
            lastName: (value) =>
                value.trim().length > 0 ? null : "Last name is required",
            email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
            password: (value) =>
                value.length >= 8 ? null : "Password must be at least 8 characters",
            confirmPassword: (value, values) =>
                value === values.password ? null : "Passwords do not match",
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
                        }
                    );
                },
            }
        );
    };

    return (
        <Container size={420} my={40}>
            <Title ta="center">Create an account</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Already have an account?{" "}
                <Link to="/login" style={{ color: "var(--mantine-color-blue-6)" }}>
                    Sign in
                </Link>
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        {registerMutation.isError && (
                            <Alert color="red" title="Registration failed">
                                {registerMutation.error?.message || "Could not create account"}
                            </Alert>
                        )}
                        <TextInput
                            label="Username"
                            placeholder="Your username"
                            required
                            {...form.getInputProps("username")}
                        />
                        <TextInput
                            label="First Name"
                            placeholder="Your first name"
                            required
                            {...form.getInputProps("firstName")}
                        />
                        <TextInput
                            label="Last Name"
                            placeholder="Your last name"
                            required
                            {...form.getInputProps("lastName")}
                        />
                        <TextInput
                            label="Email"
                            placeholder="you@example.com"
                            required
                            {...form.getInputProps("email")}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Your password"
                            required
                            {...form.getInputProps("password")}
                        />
                        <PasswordInput
                            label="Confirm Password"
                            placeholder="Confirm your password"
                            required
                            {...form.getInputProps("confirmPassword")}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            mt="xl"
                            loading={registerMutation.isPending}
                        >
                            Sign up
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}

