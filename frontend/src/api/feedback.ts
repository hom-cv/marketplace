/**
 * Feedback API client
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type { CreateFeedbackRequest, Feedback } from "@/api/types/feedback";

/** Leave feedback on a delivered purchase. */
export async function createFeedback(
  data: CreateFeedbackRequest,
): Promise<Feedback> {
  return jsonRequest<Feedback>("/feedback", "POST", data);
}

/** Get feedback a seller has received. */
export async function getUserFeedback(username: string): Promise<Feedback[]> {
  return apiRequest<Feedback[]>(
    `/users/${encodeURIComponent(username)}/feedback`,
  );
}
