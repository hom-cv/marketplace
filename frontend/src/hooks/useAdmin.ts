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
import type { BanUserRequest, BanPostRequest } from "@/api/types/admin";
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
    queryFn: async () => {
      try {
        return await getPost(postId!);
      } catch (error) {
        console.error("Failed to fetch post for admin review:", error);
        return null;
      }
    },
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports() });
    },
  });
}

export function useGenerateInvitesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (count: number) => generateInvites(count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites() });
    },
  });
}

export function useRevokeInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites() });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.userBans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.flaggedMessages() }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.postBans() }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.userBans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports() }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.postBans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports() }),
      ]);
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
        queryKey: queryKeys.admin.flaggedMessages(),
      });
      options?.onSuccess?.(result);
    },
    onError: options?.onError,
  });
}
