import {
  Container,
  Group,
  Title,
  Button,
  Burger,
  Box,
  Drawer,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import styles from "./HeaderBar.module.css";

const links = [
  { link: "/login", label: "Login" },
  { link: "/sign-up", label: "Sign up" },
] as const;

export const HeaderBar = () => {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const items = links.map((link) => {
    return (
      <Button component={Link} to={link.link} key={link.link}>
        {link.label}
      </Button>
    );
  });

  return (
    <Box>
      <header className={styles.header}>
        <Container size="md" className={styles.headerContent}>
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Title>marketplace</Title>
          </Link>
          <Group visibleFrom="xs">{items}</Group>

          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            hiddenFrom="xs"
            size="sm"
          />
        </Container>
      </header>
      <Drawer opened={drawerOpened} onClose={closeDrawer} size="100%">
        <Group justify="center" grow pb="xl" px="md">
          <Button component={Link} to="/login" onClick={closeDrawer}>
            Log in
          </Button>
          <Button component={Link} to="/sign-up" onClick={closeDrawer}>
            Sign up
          </Button>
        </Group>
      </Drawer>
    </Box>
  );
};

