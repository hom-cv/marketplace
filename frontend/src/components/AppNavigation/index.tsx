/**
 * Main navigation component - combines Header and MobileDrawer
 * This is the main export used in the app layout
 */

import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { useLogout, useCurrentUser } from "@/hooks/useAuth";
import { DepartmentBar } from "@/components/DepartmentBar";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";

export function AppNavigation() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  // Fetch current user on mount. `isLoading` is true only while the request is
  // actually in flight — so a failed/settled fetch (bad token already logged
  // out by the 401 interceptor, or a transient error) won't leave the nav
  // stuck in the loading state.
  const { isLoading: userLoading } = useCurrentUser();

  const handleLogout = () => {
    logout();
    closeDrawer();
    navigate({ to: "/" });
  };

  return (
    <Box>
      <Header
        user={user}
        userLoading={userLoading}
        drawerOpened={drawerOpened}
        onToggleDrawer={toggleDrawer}
        onLogout={handleLogout}
      />
      <DepartmentBar />
      <MobileDrawer
        opened={drawerOpened}
        onClose={closeDrawer}
        user={user}
        userLoading={userLoading}
        onLogout={handleLogout}
      />
    </Box>
  );
}
