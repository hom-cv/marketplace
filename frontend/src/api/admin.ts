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
  MessageFlag,
  MessageFlagListResponse,
} from "@/api/types/admin";
import type { ConversationDetail } from "@/api/types/chat";

/**
 * Build URLSearchParams for paginated list endpoints
 */
function buildPaginatedParams(
  skip: number,
  limit: number,
  filters?: Record<string, string | boolean | undefined>
): string {
  const params = new URLSearchParams();
  params.append("skip", String(skip));
  params.append("limit", String(limit));

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    }
  }

  return params.toString();
}

export function getAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>("/admin/stats");
}

export function generateInvites(count: number): Promise<Invite[]> {
  const request: InviteCreateRequest = { count };
  return jsonRequest<Invite[]>("/invites", "POST", request);
}

export function getInvites(
  status?: string,
  skip = 0,
  limit = 50
): Promise<InviteListResponse> {
  const query = buildPaginatedParams(skip, limit, { status });
  return apiRequest<InviteListResponse>(`/invites?${query}`);
}

export function revokeInvite(code: string): Promise<Invite> {
  return apiRequest<Invite>(`/invites/${code}`, { method: "DELETE" });
}

export function getReports(
  status?: string,
  type?: string,
  skip = 0,
  limit = 50
): Promise<ReportListResponse> {
  const query = buildPaginatedParams(skip, limit, { status, type });
  return apiRequest<ReportListResponse>(`/reports?${query}`);
}

export function reviewReport(
  reportId: number,
  request: ReportReviewRequest
): Promise<Report> {
  return jsonRequest<Report>(`/reports/${reportId}`, "PATCH", request);
}

export function getUserBans(
  activeOnly = false,
  skip = 0,
  limit = 50
): Promise<UserBanListResponse> {
  const query = buildPaginatedParams(skip, limit, { active_only: activeOnly });
  return apiRequest<UserBanListResponse>(`/admin/bans/users?${query}`);
}

export function banUser(request: BanUserRequest): Promise<UserBan> {
  return jsonRequest<UserBan>("/admin/bans/users", "POST", request);
}

export function liftUserBan(banId: number): Promise<UserBan> {
  return apiRequest<UserBan>(`/admin/bans/users/${banId}`, { method: "DELETE" });
}

export function getPostBans(
  activeOnly = false,
  skip = 0,
  limit = 50
): Promise<PostBanListResponse> {
  const query = buildPaginatedParams(skip, limit, { active_only: activeOnly });
  return apiRequest<PostBanListResponse>(`/admin/bans/posts?${query}`);
}

export function banPost(request: BanPostRequest): Promise<PostBan> {
  return jsonRequest<PostBan>("/admin/bans/posts", "POST", request);
}

export function liftPostBan(banId: number): Promise<PostBan> {
  return apiRequest<PostBan>(`/admin/bans/posts/${banId}`, { method: "DELETE" });
}

export function getFlaggedMessages(
  flagStatus?: string,
  skip = 0,
  limit = 50
): Promise<MessageFlagListResponse> {
  const query = buildPaginatedParams(skip, limit, { flag_status: flagStatus });
  return apiRequest<MessageFlagListResponse>(`/admin/flagged-messages?${query}`);
}

export function dismissFlaggedMessage(flagId: number): Promise<MessageFlag> {
  return apiRequest<MessageFlag>(`/admin/flagged-messages/${flagId}/dismiss`, {
    method: "PATCH",
  });
}

export function getAdminConversation(
  conversationId: number,
  beforeId?: number,
  limit: number = 50
): Promise<ConversationDetail> {
  const params = new URLSearchParams();
  if (beforeId) params.set("before_id", String(beforeId));
  params.set("limit", String(limit));
  return apiRequest<ConversationDetail>(
    `/admin/conversations/${conversationId}?${params.toString()}`
  );
}
