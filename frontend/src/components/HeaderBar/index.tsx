import {
  Container,
  Group,
  Title,
  Button,
  Burger,
  Box,
  Drawer,
  Text,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore, useIsAuthenticated } from "@/stores/authStore";
import { useLogout, useCurrentUser } from "@/hooks/useAuth";
import styles from "./HeaderBar.module.css";

export const HeaderBar = () => {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useIsAuthenticated();
  const logout = useLogout();

  // Try to fetch current user on mount
  useCurrentUser();

  const handleLogout = () => {
    logout();
    closeDrawer();
    navigate({ to: "/" });
  };

  const authButtons = isAuthenticated ? (
    <>
      <Text size="sm">Hey, {user?.first_name}</Text>
      <Button variant="light" onClick={handleLogout}>
        Logout
      </Button>
    </>
  ) : (
    <>
      <Button component={Link} to="/login">
        Login
      </Button>
      <Button component={Link} to="/sign-up">
        Sign up
      </Button>
    </>
  );

  const mobileAuthButtons = isAuthenticated ? (
    <Button fullWidth onClick={handleLogout}>
      Logout
    </Button>
  ) : (
    <>
      <Button component={Link} to="/login" onClick={closeDrawer}>
        Log in
      </Button>
      <Button component={Link} to="/sign-up" onClick={closeDrawer}>
        Sign up
      </Button>
    </>
  );

  return (
    <Box>
      <header className={styles.header}>
        <Container size="md" className={styles.headerContent}>
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Title>marketplace</Title>
          </Link>
          <Group visibleFrom="xs">{authButtons}</Group>

          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            hiddenFrom="xs"
            size="sm"
          />
        </Container>
      </header>
      <Drawer opened={drawerOpened} onClose={closeDrawer} size="100%">
        <Stack>
          {isAuthenticated && (
            <Button
              component={Link}
              to="/app/posts/new"
              onClick={closeDrawer}
              fullWidth
            >
              Create Listing
            </Button>
          )}
          {mobileAuthButtons}
        </Stack>
      </Drawer>
    </Box >
  );
};
