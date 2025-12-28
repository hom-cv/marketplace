/**
 * API client for user-facing report operations
 */

import { jsonRequest } from "@/api/api";
import type { Report, ReportReason, ReportType } from "@/api/types/admin";

export interface ReportCreateRequest {
  report_type: ReportType;
  reported_user_id?: number;
  reported_post_id?: number;
  reason: ReportReason;
  description: string;
}

export function submitReport(request: ReportCreateRequest): Promise<Report> {
  return jsonRequest<Report>("/reports", "POST", request);
}
