import { createRootRoute, Outlet } from "@tanstack/react-router";
import { HeaderBar } from "../components/HeaderBar";

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent() {
    return (
        <>
            <HeaderBar />
            <Outlet />
        </>
    );
}
