import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { AppNavigation } from "@/components/AppNavigation";
import { Footer } from "@/components/Footer";
import { Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminLayout } from "@/components/AdminLayout";

// Public pages
import {
  HomePage,
  LoginPage,
  SignUpPage,
  VerifyEmailPage,
  TermsPage,
  PrivacyPage,
  ProfilePage,
  PublicExplorePage,
  PublicPostViewPage,
} from "@/pages/public";

// Protected pages
import {
  DashboardPage,
  PurchaseHistoryPage,
  LikedListingsPage,
  MyListingsPage,
  SoldListingsPage,
  CreatePostPage,
  PostViewPage,
  BecomeSellerPage,
  PaymentReturnPage,
  CheckoutPage,
  ProfileEditPage,
} from "@/pages/protected";

// Admin pages
import {
  AdminDashboardPage,
  InviteCodesPage,
  ReportsPage,
  UserBansPage,
  PostBansPage,
} from "@/pages/admin";

import styles from "./router.module.css";

const rootRoute = createRootRoute({
  component: () => (
    <div className={styles.rootLayout}>
      <AppNavigation />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <Footer />
    </div>
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

// Public policy routes
const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
});

// Public profile route
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$username",
  component: ProfilePage,
});

// Public explore routes (no authentication required)
const publicExploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: PublicExplorePage,
});

const publicPostViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore/$postId",
  component: PublicPostViewPage,
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

// Redirect /app/explore to /explore (consolidated explore page)
const exploreRedirect = createRoute({
  getParentRoute: () => dashboardLayout,
  path: "/explore",
  beforeLoad: () => {
    throw redirect({ to: "/explore" });
  },
  component: () => null,
});

const purchasesRoute = createRoute({
  getParentRoute: () => dashboardLayout,
  path: "/purchases",
  component: PurchaseHistoryPage,
});

const likedListingsRoute = createRoute({
  getParentRoute: () => dashboardLayout,
  path: "/liked",
  component: LikedListingsPage,
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

const profileEditRoute = createRoute({
  getParentRoute: () => dashboardLayout,
  path: "/settings/profile",
  component: ProfileEditPage,
});

// Protected profile route (with sidebar for logged-in users)
const appProfileRoute = createRoute({
  getParentRoute: () => dashboardLayout,
  path: "/profile/$username",
  component: ProfilePage,
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
  termsRoute,
  privacyRoute,
  profileRoute,
  publicExploreRoute,
  publicPostViewRoute,

  protectedLayout.addChildren([
    dashboardLayout.addChildren([
      dashboardRoute,
      exploreRedirect,
      purchasesRoute,
      likedListingsRoute,
      myListingsRoute,
      salesRoute,
      createPostRoute,
      postViewRoute,
      becomeSellerRoute,
      paymentReturnRoute,
      checkoutRoute,
      profileEditRoute,
      appProfileRoute,
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

export const router = createRouter({
  routeTree,
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
