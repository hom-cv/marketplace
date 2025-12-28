/**
 * Admin API client
 * Functions for admin dashboard, invites, reports, and bans
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type {
  AdminStats,
  Invite,
  InviteListResponse,
  InviteCreateRequest,
  Report,
  ReportListResponse,
  ReportReviewRequest,
  UserBan,
  UserBanListResponse,
  BanUserRequest,
  PostBan,
  PostBanListResponse,
  BanPostRequest,
} from "@/api/types/admin";

// ============ Dashboard ============

export function getAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>("/admin/stats");
}

// ============ Invite Codes ============

export function generateInvites(count: number): Promise<Invite[]> {
  const request: InviteCreateRequest = { count };
  return jsonRequest<Invite[]>("/invites", "POST", request);
}

export function getInvites(
  status?: string,
  skip = 0,
  limit = 50
): Promise<InviteListResponse> {
  const params = new URLSearchParams();
  params.append("skip", String(skip));
  params.append("limit", String(limit));
  if (status) {
    params.append("status", status);
  }
  return apiRequest<InviteListResponse>(`/invites?${params.toString()}`);
}

export function revokeInvite(code: string): Promise<Invite> {
  return apiRequest<Invite>(`/invites/${code}`, { method: "DELETE" });
}

// ============ Reports ============

export function getReports(
  status?: string,
  type?: string,
  skip = 0,
  limit = 50
): Promise<ReportListResponse> {
  const params = new URLSearchParams();
  params.append("skip", String(skip));
  params.append("limit", String(limit));
  if (status) {
    params.append("status", status);
  }
  if (type) {
    params.append("type", type);
  }
  return apiRequest<ReportListResponse>(`/reports?${params.toString()}`);
}

export function reviewReport(
  reportId: number,
  request: ReportReviewRequest
): Promise<Report> {
  return jsonRequest<Report>(`/reports/${reportId}`, "PATCH", request);
}

// ============ User Bans ============

export function getUserBans(
  activeOnly = false,
  skip = 0,
  limit = 50
): Promise<UserBanListResponse> {
  const params = new URLSearchParams();
  params.append("skip", String(skip));
  params.append("limit", String(limit));
  params.append("active_only", String(activeOnly));
  return apiRequest<UserBanListResponse>(`/admin/bans/users?${params.toString()}`);
}

export function banUser(request: BanUserRequest): Promise<UserBan> {
  return jsonRequest<UserBan>("/admin/bans/users", "POST", request);
}

export function liftUserBan(banId: number): Promise<UserBan> {
  return apiRequest<UserBan>(`/admin/bans/users/${banId}`, { method: "DELETE" });
}

// ============ Post Bans ============

export function getPostBans(
  activeOnly = false,
  skip = 0,
  limit = 50
): Promise<PostBanListResponse> {
  const params = new URLSearchParams();
  params.append("skip", String(skip));
  params.append("limit", String(limit));
  params.append("active_only", String(activeOnly));
  return apiRequest<PostBanListResponse>(`/admin/bans/posts?${params.toString()}`);
}

export function banPost(request: BanPostRequest): Promise<PostBan> {
  return jsonRequest<PostBan>("/admin/bans/posts", "POST", request);
}

export function liftPostBan(banId: number): Promise<PostBan> {
  return apiRequest<PostBan>(`/admin/bans/posts/${banId}`, { method: "DELETE" });
}
