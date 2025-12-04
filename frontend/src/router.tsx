import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router";
import { HeaderBar } from "./components/HeaderBar";
import { Outlet } from "@tanstack/react-router";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { HomePage } from "./pages/HomePage";

const rootRoute = createRootRoute({
    component: () => (
        <>
            <HeaderBar />
            <Outlet />
        </>
    ),
});

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: HomePage,
});

const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: LoginPage,
});

const signUpRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/sign-up",
    component: SignUpPage,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signUpRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
