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
  BecomeSellerPage,
  PaymentReturnPage,
  CheckoutPage,
  ProfileEditPage,
  MessagesPage,
  ChatViewPage,
} from "@/pages/protected";

import { ChatSubscriptionProvider } from "@/components/ChatSubscriptionProvider";

// Admin pages
import {
  InviteCodesPage,
  ReportsPage,
  FlaggedMessagesPage,
  UserBansPage,
  PostBansPage,
} from "@/pages/admin";

import styles from "./router.module.css";

const rootRoute = createRootRoute({
  component: () => (
    <ChatSubscriptionProvider>
      <div className={styles.rootLayout}>
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
    accountSalesRoute,
    accountSettingsRoute,
    accountBecomeSellerRoute,
    messagesRoute,
    chatViewRoute,
    adminProtectedLayout.addChildren([
      adminLayout.addChildren([
        adminIndexRoute,
        adminInvitesRoute,
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
