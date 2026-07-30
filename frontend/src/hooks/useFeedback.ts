/**
 * Feedback query and mutation hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFeedback, getUserFeedback } from "@/api/feedback";
import type { CreateFeedbackRequest } from "@/api/types/feedback";
import { queryKeys } from "./queryKeys";

export function useUserFeedback(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.feedback(username!),
    queryFn: () => getUserFeedback(username!),
    enabled: !!username,
  });
}

export function useCreateFeedbackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => createFeedback(data),
    onSuccess: () => {
      // Purchases/sales carry a has_feedback flag; the profile carries the rating.
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.myPurchases });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.mySales });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.allFeedback });
    },
  });
}
