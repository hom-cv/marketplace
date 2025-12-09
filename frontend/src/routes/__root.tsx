import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppNavigation } from "@/components/AppNavigation";

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent() {
    return (
        <>
            <AppNavigation />
            <Outlet />
        </>
    );
}
