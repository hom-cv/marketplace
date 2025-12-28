/**
 * Admin API client for invites, reports, and bans
 */

import { apiRequest, jsonRequest } from '@/api/api';
import type {
  InviteCreateRequest,
  InviteResponse,
  InviteListResponse,
  ReportCreateRequest,
  ReportResponse,
  ReportListResponse,
  ReportReviewRequest,
  BanUserRequest,
  BanPostRequest,
  UserBanResponse,
  PostBanResponse,
  UserBanListResponse,
  PostBanListResponse,
  AdminStatsResponse,
} from '@/api/types/admin';

/** Builds a query string from params, filtering out undefined/null values */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// =============================================================================
// Invites
// =============================================================================

export async function generateInvites(request: InviteCreateRequest): Promise<InviteResponse[]> {
  return jsonRequest<InviteResponse[]>('/invites', 'POST', request);
}

export async function listInvites(params?: {
  status?: 'active' | 'used' | 'revoked';
  skip?: number;
  limit?: number;
}): Promise<InviteListResponse> {
  return apiRequest<InviteListResponse>(`/invites${buildQueryString(params ?? {})}`);
}

export async function revokeInvite(code: string): Promise<InviteResponse> {
  return apiRequest<InviteResponse>(`/invites/${code}`, { method: 'DELETE' });
}

// =============================================================================
// Reports
// =============================================================================

export async function submitReport(request: ReportCreateRequest): Promise<ReportResponse> {
  return jsonRequest<ReportResponse>('/reports', 'POST', request);
}

export async function listReports(params?: {
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  type?: 'user' | 'post';
  skip?: number;
  limit?: number;
}): Promise<ReportListResponse> {
  return apiRequest<ReportListResponse>(`/reports${buildQueryString(params ?? {})}`);
}

export async function reviewReport(
  reportId: number,
  request: ReportReviewRequest
): Promise<ReportResponse> {
  return apiRequest<ReportResponse>(`/reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

// =============================================================================
// User Bans
// =============================================================================

export async function banUser(request: BanUserRequest): Promise<UserBanResponse> {
  return jsonRequest<UserBanResponse>('/admin/bans/users', 'POST', request);
}

export async function liftUserBan(banId: number): Promise<UserBanResponse> {
  return apiRequest<UserBanResponse>(`/admin/bans/users/${banId}`, { method: 'DELETE' });
}

export async function listUserBans(params?: {
  active_only?: boolean;
  skip?: number;
  limit?: number;
}): Promise<UserBanListResponse> {
  return apiRequest<UserBanListResponse>(`/admin/bans/users${buildQueryString(params ?? {})}`);
}

// =============================================================================
// Post Bans
// =============================================================================

export async function banPost(request: BanPostRequest): Promise<PostBanResponse> {
  return jsonRequest<PostBanResponse>('/admin/bans/posts', 'POST', request);
}

export async function liftPostBan(banId: number): Promise<PostBanResponse> {
  return apiRequest<PostBanResponse>(`/admin/bans/posts/${banId}`, { method: 'DELETE' });
}

export async function listPostBans(params?: {
  active_only?: boolean;
  skip?: number;
  limit?: number;
}): Promise<PostBanListResponse> {
  return apiRequest<PostBanListResponse>(`/admin/bans/posts${buildQueryString(params ?? {})}`);
}

// =============================================================================
// Dashboard
// =============================================================================

export async function getAdminStats(): Promise<AdminStatsResponse> {
  return apiRequest<AdminStatsResponse>('/admin/stats');
}
