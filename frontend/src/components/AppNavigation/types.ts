/**
 * Shared navigation types and utilities
 */

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

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
