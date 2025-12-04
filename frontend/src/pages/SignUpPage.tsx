import { Link } from "@tanstack/react-router";
import {
    TextInput,
    PasswordInput,
    Button,
    Paper,
    Title,
    Text,
    Container,
    Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";

export function SignUpPage() {
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
                value.length >= 6 ? null : "Password must be at least 6 characters",
            confirmPassword: (value, values) =>
                value === values.password ? null : "Passwords do not match",
        },
    });

    const handleSubmit = (values: typeof form.values) => {
        console.log("Sign up submitted:", values);
        // TODO: Implement actual sign up logic
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
                        <Button type="submit" fullWidth mt="xl">
                            Sign up
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
