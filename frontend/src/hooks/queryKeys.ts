/**
 * Centralized query key factory.
 * All hook files and consumers import keys from here.
 */

export const queryKeys = {
  // Auth
  currentUser: ["currentUser"] as const,
  verifyEmail: (token: string) => ["verifyEmail", token] as const,

  // Posts
  posts: {
    all: ["posts"] as const,
    guestPreview: ["posts", "guestLandingPreview"] as const,
    my: ["posts", "me"] as const,
    public: (filters: unknown) => ["publicPosts", filters] as const,
    detail: (postId: number | string | null) =>
      ["post", postId == null ? null : String(postId)] as const,
    liked: ["likedPosts"] as const,
    byUser: (username: string) => ["userPosts", username] as const,
  },

  // Brands
  brands: {
    all: ["brands"] as const,
  },

  // Category taxonomy (static)
  categories: {
    all: ["categories"] as const,
  },

  // Payments
  payments: {
    priceBreakdown: (postId: number | string, method?: string) =>
      method
        ? (["priceBreakdown", postId, method] as const)
        : (["priceBreakdown", postId] as const),
    earningsPreview: (itemPrice: number, shippingCost: number) =>
      ["earningsPreview", itemPrice, shippingCost] as const,
    status: (paymentId: number | null) => ["paymentStatus", paymentId] as const,
    myPurchases: ["myPurchases"] as const,
    mySales: ["mySales"] as const,
  },

  // Users
  users: {
    profile: (username?: string) =>
      username
        ? (["userProfile", username] as const)
        : (["userProfile"] as const),
    feedback: (username: string) => ["userFeedback", username] as const,
  },

  // Chat
  chat: {
    conversations: ["conversations"] as const,
    allConversationDetails: ["conversation"] as const,
    conversation: (conversationId: number | null) =>
      ["conversation", conversationId] as const,
  },

  // Seller
  seller: {
    status: ["sellerStatus"] as const,
  },

  // Admin
  admin: {
    // Root prefix keys for broad invalidation (matches all filtered variants)
    allReports: ["adminReports"] as const,
    allInvites: ["adminInvites"] as const,
    allUserBans: ["adminUserBans"] as const,
    allPostBans: ["adminPostBans"] as const,
    allFlaggedMessages: ["adminFlaggedMessages"] as const,
    // Parameterized keys for specific queries
    users: (search?: string | null, skip?: number) =>
      ["adminUsers", search, skip] as const,
    reports: (status?: string | null, type?: string | null) =>
      ["adminReports", status, type] as const,
    invites: (status?: string | null) => ["adminInvites", status] as const,
    userBans: (activeOnly?: boolean) => ["adminUserBans", activeOnly] as const,
    postBans: (activeOnly?: boolean) => ["adminPostBans", activeOnly] as const,
    flaggedMessages: (status?: string | null) =>
      ["adminFlaggedMessages", status] as const,
    conversation: (conversationId: number | null) =>
      ["adminConversation", conversationId] as const,
    conversationPost: (postId?: number) =>
      ["adminConversationPost", postId] as const,
  },
} as const;
