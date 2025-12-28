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
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { ExplorePage } from "@/pages/Explore";
import { PurchaseHistoryPage } from "@/pages/PurchaseHistory";
import { MyListingsPage } from "@/pages/MyListings";
import { SoldListingsPage } from "@/pages/SoldListings";
import { PaymentReturnPage } from "@/pages/PaymentReturn";
import { PostViewPage } from "@/pages/PostView";
import { CheckoutPage } from "@/pages/Checkout";
import { AdminLayout } from "@/components/AdminLayout";
import {
    AdminDashboardPage,
    InviteCodesPage,
    ReportsPage,
    UserBansPage,
    PostBansPage,
} from "@/pages/Admin";

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

const postViewRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/posts/$postId",
    component: PostViewPage,
});

const becomeSellerRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/become-seller",
    component: BecomeSellerPage,
});

const paymentReturnRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/payment-return",
    component: PaymentReturnPage,
    validateSearch: (search: Record<string, unknown>) => ({
        payment_id: (search.payment_id as string) || undefined,
        status: (search.status as string) || undefined,
    }),
});

const checkoutRoute = createRoute({
    getParentRoute: () => dashboardLayout,
    path: "/checkout/$postId",
    component: CheckoutPage,
});

// Admin protected route wrapper - ensures user is admin
const adminProtectedLayout = createRoute({
    getParentRoute: () => protectedLayout,
    id: "admin-protected",
    component: AdminProtectedRoute,
});

// Admin layout with sidebar - parent for all /admin routes
const adminLayout = createRoute({
    getParentRoute: () => adminProtectedLayout,
    path: "/admin",
    component: AdminLayout,
});

// Admin pages
const adminDashboardRoute = createRoute({
    getParentRoute: () => adminLayout,
    path: "/",
    component: AdminDashboardPage,
});

const adminInvitesRoute = createRoute({
    getParentRoute: () => adminLayout,
    path: "/invites",
    component: InviteCodesPage,
});

const adminReportsRoute = createRoute({
    getParentRoute: () => adminLayout,
    path: "/reports",
    component: ReportsPage,
});

const adminUserBansRoute = createRoute({
    getParentRoute: () => adminLayout,
    path: "/bans/users",
    component: UserBansPage,
});

const adminPostBansRoute = createRoute({
    getParentRoute: () => adminLayout,
    path: "/bans/posts",
    component: PostBansPage,
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
            postViewRoute,
            becomeSellerRoute,
            paymentReturnRoute,
            checkoutRoute,
        ]),
        adminProtectedLayout.addChildren([
            adminLayout.addChildren([
                adminDashboardRoute,
                adminInvitesRoute,
                adminReportsRoute,
                adminUserBansRoute,
                adminPostBansRoute,
            ]),
        ]),
    ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
