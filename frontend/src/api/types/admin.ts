/**
 * Admin API Types
 * Types for admin dashboard, invites, reports, and bans
 */

import type { User } from "@/api/types/user";

export interface UserListResponse {
  items: User[];
  total: number;
}

export interface AdminStats {
  pending_reports: number;
  active_user_bans: number;
  active_post_bans: number;
  pending_flags: number;
}

export type InviteStatus = "active" | "used" | "revoked";

export interface Invite {
  code: string;
  status: InviteStatus;
  fee_free_sales: number;
  created_date: string;
  used_at: string | null;
  created_by_username: string | null;
  used_by_username: string | null;
}

export interface InviteListResponse {
  items: Invite[];
  total: number;
  skip: number;
  limit: number;
}

export interface InviteCreateRequest {
  count: number;
  fee_free_sales: number;
}

export type ReportType = "user" | "post";
export type ReportReason = "counterfeit" | "abuse_of_system" | "prohibited_item" | "scam";
export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface Report {
  id: number;
  report_type: ReportType;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  created_date: string;
  reporter_username: string | null;
  reported_user_id: number | null;
  reported_username: string | null;
  reported_post_id: number | null;
  reported_post_title: string | null;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  is_user_banned: boolean;
  is_post_banned: boolean;
}

export interface ReportListResponse {
  items: Report[];
  total: number;
  skip: number;
  limit: number;
}

export interface ReportReviewRequest {
  status: "reviewed" | "resolved" | "dismissed";
  admin_notes?: string;
}

export interface ReportCreateRequest {
  report_type: ReportType;
  reported_user_id?: number;
  reported_post_id?: number;
  reason: ReportReason;
  description: string;
}

export interface UserBan {
  id: number;
  user_id: number;
  username: string;
  reason: string;
  is_active: boolean;
  created_date: string;
  banned_by_username: string;
  lifted_at: string | null;
  lifted_by_username: string | null;
}

export interface UserBanListResponse {
  items: UserBan[];
  total: number;
  skip: number;
  limit: number;
}

export interface BanUserRequest {
  user_id: number;
  reason: string;
}

export interface PostBan {
  id: number;
  post_id: number;
  post_title: string;
  seller_username: string;
  reason: string;
  is_active: boolean;
  created_date: string;
  banned_by_username: string;
  lifted_at: string | null;
  lifted_by_username: string | null;
}

export interface PostBanListResponse {
  items: PostBan[];
  total: number;
  skip: number;
  limit: number;
}

export interface BanPostRequest {
  post_id: number;
  reason: string;
}

export type MessageFlagStatus = "PENDING" | "DISMISSED";

export interface MessageFlag {
  id: number;
  message_id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  message_content: string;
  matched_patterns: string[];
  status: MessageFlagStatus;
  created_date: string;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
}

export interface MessageFlagListResponse {
  items: MessageFlag[];
  total: number;
  skip: number;
  limit: number;
}

export interface ConversationGroup {
  conversationId: number;
  senderUsernames: string[];
  senderIds: number[];
  primarySenderId: number;
  flags: MessageFlag[];
  pendingCount: number;
  latestDate: string;
}
