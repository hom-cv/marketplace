/**
 * Admin-related query and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFlaggedMessages,
  getAdminConversation,
  getReports,
  getInvites,
  getUserBans,
  getPostBans,
  getPendingPayouts,
  getPayoutHistory,
  createPayout,
  reviewReport,
  generateInvites,
  revokeInvite,
  banUser,
  banPost,
  liftUserBan,
  liftPostBan,
  dismissFlaggedMessage,
} from "@/api/admin";
import { getPost } from "@/api/posts";
import type {
  BanUserRequest,
  BanPostRequest,
  PayoutResponse,
} from "@/api/types/admin";
import { queryKeys } from "./queryKeys";

// Queries

export function useAdminReports(
  statusFilter?: string | null,
  typeFilter?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.admin.reports(statusFilter, typeFilter),
    queryFn: () =>
      getReports(statusFilter || undefined, typeFilter || undefined),
  });
}

export function useAdminInvites(statusFilter?: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.invites(statusFilter),
    queryFn: () => getInvites(statusFilter || undefined),
  });
}

export function useAdminUserBans(activeOnly: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.userBans(activeOnly),
    queryFn: () => getUserBans(activeOnly),
  });
}

export function useAdminPostBans(activeOnly: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.postBans(activeOnly),
    queryFn: () => getPostBans(activeOnly),
  });
}

export function useAdminFlaggedMessages(statusFilter?: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.flaggedMessages(statusFilter),
    queryFn: () => getFlaggedMessages(statusFilter || undefined),
  });
}

export function useAdminConversation(
  conversationId: number | null,
  limit = 50,
) {
  return useQuery({
    queryKey: queryKeys.admin.conversation(conversationId),
    queryFn: () =>
      getAdminConversation(conversationId!, undefined, limit),
    enabled: conversationId !== null,
    staleTime: Infinity,
  });
}

export function useAdminConversationPost(postId?: number) {
  return useQuery({
    queryKey: queryKeys.admin.conversationPost(postId),
    queryFn: () => getPost(postId!),
    enabled: !!postId,
    staleTime: Infinity,
  });
}

// Mutations

export function useReviewReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      status,
      adminNotes,
    }: {
      reportId: number;
      status: "reviewed" | "resolved" | "dismissed";
      adminNotes?: string;
    }) =>
      reviewReport(reportId, {
        status,
        admin_notes: adminNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.allReports });
    },
  });
}

export function useGenerateInvitesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (count: number) => generateInvites(count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.allInvites });
    },
  });
}

export function useRevokeInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.allInvites });
    },
  });
}

export function useBanUserMutation(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: BanUserRequest) => banUser(request),
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allReports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allUserBans }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allFlaggedMessages }),
      ]);
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

export function useBanPostMutation(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: BanPostRequest) => banPost(request),
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allReports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allPostBans }),
      ]);
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

export function useLiftUserBanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (banId: number) => liftUserBan(banId),
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allUserBans }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allReports }),
      ]);
    },
  });
}

export function useLiftPostBanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (banId: number) => liftPostBan(banId),
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allPostBans }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.allReports }),
      ]);
    },
  });
}

export function useAdminPayouts() {
  return useQuery({
    queryKey: queryKeys.admin.payouts,
    queryFn: () => getPendingPayouts(),
  });
}

export function useAdminPayoutHistory() {
  return useQuery({
    queryKey: queryKeys.admin.payoutHistory,
    queryFn: () => getPayoutHistory(),
  });
}

export function useCreatePayoutMutation(options?: {
  onSuccess?: (data: PayoutResponse, paymentId: number) => void;
  onError?: (err: Error, paymentId: number) => void;
  onSettled?: (paymentId: number) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => createPayout(paymentId),
    onSuccess: (data, paymentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.allPayouts });
      options?.onSuccess?.(data, paymentId);
    },
    onError: (err, paymentId) => {
      options?.onError?.(err, paymentId);
    },
    onSettled: (_data, _err, paymentId) => {
      options?.onSettled?.(paymentId);
    },
  });
}

export function useDismissFlaggedMessageMutation(options?: {
  onSuccess?: (result: { total: number; failed: number }) => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (flagIds: number[]) => {
      const results = await Promise.allSettled(
        flagIds.map((id) => dismissFlaggedMessage(id)),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (flagIds.length > 0 && failed.length === results.length) {
        throw new Error("Failed to dismiss all flags");
      }
      return { total: results.length, failed: failed.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.allFlaggedMessages,
      });
      options?.onSuccess?.(result);
    },
    onError: options?.onError,
  });
}
