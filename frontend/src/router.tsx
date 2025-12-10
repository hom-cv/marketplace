import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router";
import { AppNavigation } from "@/components/AppNavigation";
import { Outlet } from "@tanstack/react-router";
import { LoginPage } from "@/pages/Login";
import { SignUpPage } from "@/pages/SignUp";
import { HomePage } from "@/pages/Home";
import { VerifyEmailPage } from "@/pages/VerifyEmail";
import { CreatePostPage } from "@/pages/CreatePost";
import { BecomeSellerPage } from "@/pages/BecomeSeller";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { ExplorePage } from "@/pages/Explore";
import { PurchaseHistoryPage } from "@/pages/PurchaseHistory";
import { MyListingsPage } from "@/pages/MyListings";
import { SoldListingsPage } from "@/pages/SoldListings";

const rootRoute = createRootRoute({
    component: () => (
        <>
            <AppNavigation />
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

// Protected routes wrapper
const protectedLayout = createRoute({
    getParentRoute: () => rootRoute,
    id: "protected",
    component: ProtectedRoute,
});

// Dashboard layout with sidebar - parent for all /app routes
const dashboardLayout = createRoute({
    getParentRoute: () => protectedLayout,
    path: "/app",
    component: DashboardLayout,
});

// Dashboard pages
const dashboardRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/",
    component: DashboardPage,
});

const exploreRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/explore",
    component: ExplorePage,
});

const purchasesRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/purchases",
    component: PurchaseHistoryPage,
});

const myListingsRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/my-listings",
    component: MyListingsPage,
});

const salesRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/sales",
    component: SoldListingsPage,
});

const createPostRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/posts/new",
    component: CreatePostPage,
});

const becomeSellerRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/become-seller",
    component: BecomeSellerPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    signUpRoute,
    verifyEmailRoute,
    protectedLayout.addChildren([
        dashboardLayout.addChildren([
            dashboardRoute,
            exploreRoute,
            purchasesRoute,
            myListingsRoute,
            salesRoute,
            createPostRoute,
            becomeSellerRoute,
        ]),
    ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

