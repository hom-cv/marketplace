import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router";
import { HeaderBar } from "./components/HeaderBar";
import { Outlet } from "@tanstack/react-router";
import { LoginPage } from "./pages/Login";
import { SignUpPage } from "./pages/SignUp";
import { HomePage } from "./pages/Home";
import { AppPage } from "./pages/App";
import { VerifyEmailPage } from "./pages/VerifyEmail";
import { CreatePostPage } from "./pages/CreatePost";
import { ProtectedRoute } from "./components/ProtectedRoute";

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

const verifyEmailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/verify-email",
    component: VerifyEmailPage,
    validateSearch: (search: Record<string, unknown>) => ({
        token: (search.token as string) || undefined,
    }),
});

// Protected routes layout
const protectedLayout = createRoute({
    getParentRoute: () => rootRoute,
    id: "protected",
    component: ProtectedRoute,
});

const appRoute = createRoute({
    getParentRoute: () => protectedLayout,
    path: "/app",
    component: AppPage,
});

const createPostRoute = createRoute({
    getParentRoute: () => protectedLayout,
    path: "/app/posts/new",
    component: CreatePostPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    signUpRoute,
    verifyEmailRoute,
    protectedLayout.addChildren([appRoute, createPostRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
