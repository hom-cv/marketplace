/**
 * Main navigation component - combines Header and MobileDrawer
 * This is the main export used in the app layout
 */

import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore, useIsAuthenticated } from "@/stores/authStore";
import { useLogout, useCurrentUser } from "@/hooks/useAuth";
import { DepartmentBar } from "@/components/DepartmentBar";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";

export function AppNavigation() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useIsAuthenticated();
  const logout = useLogout();

  // Fetch current user on mount
  useCurrentUser();

  const handleLogout = () => {
    logout();
    closeDrawer();
    navigate({ to: "/" });
  };

  return (
    <Box>
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        drawerOpened={drawerOpened}
        onToggleDrawer={toggleDrawer}
        onLogout={handleLogout}
      />
      <DepartmentBar />
      <MobileDrawer
        opened={drawerOpened}
        onClose={closeDrawer}
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />
    </Box>
  );
}

// Re-export for backward compatibility
export { AppNavigation as HeaderBar };
