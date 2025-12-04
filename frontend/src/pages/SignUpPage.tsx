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
            email: "",
            password: "",
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
            password: (value) =>
                value.length >= 6 ? null : "Password must be at least 6 characters",
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
                        <Button type="submit" fullWidth mt="xl">
                            Sign up
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
