/**
 * Chat-related query hooks
 */

import { useQuery } from "@tanstack/react-query";
import { getConversations, getConversationMessages } from "@/api/chat";
import { queryKeys } from "./queryKeys";

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: getConversations,
  });
}

export function useConversation(conversationId: number | null) {
  return useQuery({
    queryKey: queryKeys.chat.conversation(conversationId),
    queryFn: () =>
      conversationId ? getConversationMessages(conversationId) : null,
    enabled: !!conversationId,
    staleTime: Infinity,
  });
}
