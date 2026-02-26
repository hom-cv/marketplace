/**
 * Hook for sending chat messages with WS-first, REST fallback.
 * Includes optimistic cache updates.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageRest } from "@/api/chat";
import { useAuthStore } from "@/stores/authStore";
import { getGlobalWsRef } from "@/hooks/useChatSubscription";
import type { ConversationDetail, ChatMessage } from "@/api/types/chat";

interface SendMessageParams {
  conversationId: number;
  content: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({ conversationId, content }: SendMessageParams) => {
      const ws = getGlobalWsRef();

      // Try WebSocket first
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "message",
            conversation_id: conversationId,
            content,
          })
        );
        // WS ack will arrive via useChatSubscription and update cache.
        // Return a placeholder - the real message comes via WS.
        return null;
      }

      // Fallback to REST
      return sendMessageRest(conversationId, content);
    },

    onMutate: async ({ conversationId, content }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["conversation", conversationId],
      });

      const previous = queryClient.getQueryData<ConversationDetail>([
        "conversation",
        conversationId,
      ]);

      // Optimistic update: append a temporary message
      if (previous && currentUserId) {
        const optimisticMessage: ChatMessage = {
          id: -Date.now(), // Negative temp ID
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
          created_date: new Date().toISOString(),
        };

        queryClient.setQueryData<ConversationDetail>(
          ["conversation", conversationId],
          {
            ...previous,
            messages: [...previous.messages, optimisticMessage],
            total_messages: previous.total_messages + 1,
          }
        );
      }

      return { previous, conversationId };
    },

    onError: (_err, _vars, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(
          ["conversation", context.conversationId],
          context.previous
        );
      }
    },

    onSettled: (_data, _error, _vars) => {
      // If we used REST fallback and got a real message back, the cache
      // will be updated. For WS path, the subscription handles it.
      // Invalidate conversation list for last_message update.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
