/**
 * Shared navigation types and utilities
 */

import { IconBuildingStore, IconPlus } from "@tabler/icons-react";

export interface UserInfo {
  first_name?: string;
  last_name?: string;
  username: string;
  is_seller: boolean;
  is_admin?: boolean;
}

export function getInitials(user: UserInfo | null): string {
  if (!user) return "?";
  const first = user.first_name?.[0] || "";
  const last = user.last_name?.[0] || "";
  return (first + last).toUpperCase() || user.username[0].toUpperCase();
}

/**
 * The primary "start selling" action, which differs by seller status. Single
 * source of its route/label/icon for the header, drawer, and user menu.
 */
export function sellerAction(isSeller: boolean) {
  return isSeller
    ? ({
        to: "/account/listings/new",
        labelKey: "menu.createListing",
        icon: IconPlus,
      } as const)
    : ({
        to: "/account/become-seller",
        labelKey: "menu.becomeSeller",
        icon: IconBuildingStore,
      } as const);
}
