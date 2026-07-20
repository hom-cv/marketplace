/**
 * Feedback (review) types
 */

export interface Feedback {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_username: string;
}

export interface CreateFeedbackRequest {
  payment_id: number;
  rating: number;
  comment: string | null;
}
