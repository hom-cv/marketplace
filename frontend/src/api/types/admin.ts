/**
 * Admin-related types for invites, reports, and bans
 */

export interface InviteCreateRequest {
  count?: number; // 1-50, defaults to 1
}

export interface InviteResponse {
  code: string;
  status: 'active' | 'used' | 'revoked';
  created_date: string;
  used_at: string | null;
  created_by_username: string | null;
  used_by_username: string | null;
}

export interface InviteListResponse {
  items: InviteResponse[];
  total: number;
  skip: number;
  limit: number;
}

export type ReportType = 'user' | 'post';
export type ReportReason = 'counterfeit' | 'abuse_of_system' | 'prohibited_item' | 'scam';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ReportCreateRequest {
  report_type: ReportType;
  reported_user_id?: number;
  reported_post_id?: number;
  reason: ReportReason;
  description: string;
}

export interface ReportResponse {
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
}

export interface ReportReviewRequest {
  status: 'reviewed' | 'resolved' | 'dismissed';
  admin_notes?: string;
}

export interface ReportListResponse {
  items: ReportResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface BanUserRequest {
  user_id: number;
  reason: string;
}

export interface BanPostRequest {
  post_id: number;
  reason: string;
}

export interface UserBanResponse {
  id: number;
  user_id: number;
  username: string;
  email: string;
  reason: string;
  is_active: boolean;
  created_date: string;
  banned_by_username: string;
  lifted_at: string | null;
  lifted_by_username: string | null;
}

export interface PostBanResponse {
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

export interface UserBanListResponse {
  items: UserBanResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface PostBanListResponse {
  items: PostBanResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminStatsResponse {
  pending_reports: number;
  active_user_bans: number;
  active_post_bans: number;
}
