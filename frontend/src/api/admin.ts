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
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.skip) searchParams.set('skip', params.skip.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  return apiRequest<InviteListResponse>(`/invites${queryString ? `?${queryString}` : ''}`);
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
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.skip) searchParams.set('skip', params.skip.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  return apiRequest<ReportListResponse>(`/reports${queryString ? `?${queryString}` : ''}`);
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
  const searchParams = new URLSearchParams();
  if (params?.active_only) searchParams.set('active_only', 'true');
  if (params?.skip) searchParams.set('skip', params.skip.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  return apiRequest<UserBanListResponse>(`/admin/bans/users${queryString ? `?${queryString}` : ''}`);
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
  const searchParams = new URLSearchParams();
  if (params?.active_only) searchParams.set('active_only', 'true');
  if (params?.skip) searchParams.set('skip', params.skip.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  return apiRequest<PostBanListResponse>(`/admin/bans/posts${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// Dashboard
// =============================================================================

export async function getAdminStats(): Promise<AdminStatsResponse> {
  return apiRequest<AdminStatsResponse>('/admin/stats');
}
