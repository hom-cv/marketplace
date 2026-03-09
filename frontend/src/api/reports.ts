/**
 * API client for user-facing report operations
 */

import { jsonRequest } from "@/api/api";
import type { Report, ReportCreateRequest } from "@/api/types/admin";

export type { ReportCreateRequest };

export function submitReport(request: ReportCreateRequest): Promise<Report> {
  return jsonRequest<Report>("/reports", "POST", request);
}
