import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { AppNavigation } from "@/components/AppNavigation";
import { Footer } from "@/components/Footer";
import { POST_TYPES } from "@/api/types/post";
import type { PostType } from "@/api/types/post";
import { isDepartment, type Department } from "@/constants/departments";
import { Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
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
  PurchaseHistoryPage,
  LikedListingsPage,
  MyListingsPage,
  SoldListingsPage,
  CreatePostPage,
  EditPostPage,
  BecomeSellerPage,
  PaymentReturnPage,
  CheckoutPage,
  ProfileEditPage,
  MessagesPage,
  ChatViewPage,
} from "@/pages/protected";

import { ChatSubscriptionProvider } from "@/components/ChatSubscriptionProvider";
import { VerificationGate } from "@/components/VerificationGate";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

// Admin pages
import {
  UsersPage,
  InviteCodesPage,
  BrandsPage,
  ReportsPage,
  FlaggedMessagesPage,
  UserBansPage,
  PostBansPage,
} from "@/pages/admin";

import styles from "./router.module.css";

const rootRoute = createRootRoute({
  component: () => (
    <ChatSubscriptionProvider>
      <VerificationGate />
      <div className={styles.rootLayout}>
        <ImpersonationBanner />
        <AppNavigation />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </ChatSubscriptionProvider>
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
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    department?: Department;
    types?: PostType[];
    sizes?: string[];
    brands?: string[];
    tags?: string[];
    search?: string;
  } => {
    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : [];
    const types = [
      ...new Set(
        asArray(search.types).filter((t): t is PostType =>
          (POST_TYPES as readonly string[]).includes(t),
        ),
      ),
    ];
    const sizes = [...new Set(asArray(search.sizes).filter(Boolean))];
    const brands = [...new Set(asArray(search.brands).filter(Boolean))];
    const tags = [...new Set(asArray(search.tags).filter(Boolean))];
    const q = typeof search.search === "string" ? search.search.trim() : "";
    return {
      department: isDepartment(search.department)
        ? search.department
        : undefined,
      types: types.length ? types : undefined,
      sizes: sizes.length ? sizes : undefined,
      brands: brands.length ? brands : undefined,
      tags: tags.length ? tags : undefined,
      search: q || undefined,
    };
  },
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

// Checkout route (protected, no sidebar)
const checkoutRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/checkout/$postId",
  component: CheckoutPage,
});

// Payment return route (protected, no sidebar)
const paymentReturnRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/payment-return",
  component: PaymentReturnPage,
  validateSearch: (search: Record<string, unknown>) => ({
    payment_id: (search.payment_id as string) || undefined,
    status: (search.status as string) || undefined,
  }),
});

// Account routes (protected, no sidebar)
const accountPurchasesRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/purchases",
  component: PurchaseHistoryPage,
});

const accountLikedRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/liked",
  component: LikedListingsPage,
});

const accountListingsRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/listings",
  component: MyListingsPage,
});

const accountListingsNewRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/listings/new",
  component: CreatePostPage,
});

const accountListingsEditRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/listings/$postId/edit",
  component: EditPostPage,
});

const accountSalesRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/sales",
  component: SoldListingsPage,
});

const accountSettingsRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/settings",
  component: ProfileEditPage,
});

const accountBecomeSellerRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/account/become-seller",
  component: BecomeSellerPage,
});

const messagesRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/messages",
  component: MessagesPage,
});

const chatViewRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/messages/$conversationId",
  component: ChatViewPage,
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

// Admin index — redirect to reports
const adminIndexRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/admin/reports" });
  },
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: "/users",
  component: UsersPage,
});

const adminInvitesRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: "/invites",
  component: InviteCodesPage,
});

const adminBrandsRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: "/brands",
  component: BrandsPage,
});

const adminReportsRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: "/reports",
  component: ReportsPage,
});

const adminFlaggedMessagesRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: "/flagged-messages",
  component: FlaggedMessagesPage,
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
  publicExploreRoute,
  publicPostViewRoute,

  protectedLayout.addChildren([
    checkoutRoute,
    paymentReturnRoute,
    accountPurchasesRoute,
    accountLikedRoute,
    accountListingsRoute,
    accountListingsNewRoute,
    accountListingsEditRoute,
    accountSalesRoute,
    accountSettingsRoute,
    accountBecomeSellerRoute,
    messagesRoute,
    chatViewRoute,
    adminProtectedLayout.addChildren([
      adminLayout.addChildren([
        adminIndexRoute,
        adminUsersRoute,
        adminInvitesRoute,
        adminBrandsRoute,
        adminReportsRoute,
        adminFlaggedMessagesRoute,
        adminUserBansRoute,
        adminPostBansRoute,
      ]),
    ]),
  ]),

  profileRoute,
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
