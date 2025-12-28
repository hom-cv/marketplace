export const BanEntityType = {
  Listing: "Listing",
  User: "User",
} as const;

export type BanEntityType = (typeof BanEntityType)[keyof typeof BanEntityType];
