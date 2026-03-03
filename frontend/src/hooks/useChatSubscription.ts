/**
 * App-level WebSocket hook for chat.
 *
 * Call once at root when authenticated. Manages the single WS connection
 * and updates TanStack Query cache on incoming messages.
 *
 * Pattern from TkDodo: https://tkdodo.eu/blog/using-web-sockets-with-react-query
 */

import { useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { getWsTicket, getWebSocketUrl } from "@/api/chat";
import type { WebSocketMessage, ConversationDetail } from "@/api/types/chat";

const defaultWsRef: React.RefObject<WebSocket | null> = { current: null };

export const ChatWebSocketContext =
  createContext<React.RefObject<WebSocket | null>>(defaultWsRef);

export function useChatWebSocket() {
  return useContext(ChatWebSocketContext);
}

/** Delay in milliseconds before attempting to reconnect a dropped WebSocket. */
const RECONNECT_DELAY_MS = 3000;

/** Close codes that indicate permanent failure — do not reconnect. */
const PERMANENT_CLOSE_CODES = new Set([
  4001, // Invalid / expired ticket
  4003, // Account banned
  4008, // Too many connections
]);

export function useChatSubscription() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const connectingRef = useRef(false);
  const connectRef = useRef<(() => void) | undefined>(undefined);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        if (data.type === "new_message" && data.conversation_id && data.message) {
          const message = data.message;
          const conversationId = data.conversation_id;
          const currentUserId = useAuthStore.getState().user?.id;

          // Append message to active conversation cache (if open)
          queryClient.setQueryData<ConversationDetail>(
            ["conversation", conversationId],
            (old) => {
              if (!old) return old;
              // Deduplicate by message ID
              const exists = old.messages.some((m) => m.id === message.id);
              if (exists) return old;

              // If the message is from the current user, it's an ack for an
              // optimistic update. Replace the temporary (negative-ID) message
              // instead of appending a duplicate.
              if (currentUserId && message.sender_id === currentUserId) {
                const optimisticIdx = old.messages.findIndex((m) => m.id < 0);
                if (optimisticIdx !== -1) {
                  const updated = [...old.messages];
                  updated[optimisticIdx] = message;
                  return { ...old, messages: updated };
                }
              }

              return {
                ...old,
                messages: [...old.messages, message],
                total_messages: old.total_messages + 1,
              };
            }
          );

          // Refresh conversation list (for last_message preview + reorder)
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      } catch (err) {
        console.warn("Failed to parse WebSocket message:", err);
      }
    },
    [queryClient]
  );

  const connect = useCallback(async () => {
    if (!useAuthStore.getState().token || connectingRef.current) return;
    connectingRef.current = true;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    let ticket: string;
    try {
      ticket = await getWsTicket();
    } catch {
      // Ticket fetch failed (401 triggers auto-logout via apiRequest).
      // For other errors, retry after delay.
      connectingRef.current = false;
      if (useAuthStore.getState().token) {
        reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), RECONNECT_DELAY_MS);
      }
      return;
    }

    const ws = new WebSocket(getWebSocketUrl(ticket));

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        // Handle auth acknowledgement
        if (data.type === "auth" && data.status === "ok") {
          wsRef.current = ws;
          // On reconnect, invalidate all chat queries to catch missed messages
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["conversation"] });
          return;
        }
      } catch {
        // fall through to normal handler
      }
      handleMessage(event);
    };

    ws.onclose = (event: CloseEvent) => {
      wsRef.current = null;
      connectingRef.current = false;

      // Auth-related close codes — clear session
      if (event.code === 4001 || event.code === 4003) {
        useAuthStore.getState().logout();
        return;
      }

      // Don't reconnect on permanent failures
      if (PERMANENT_CLOSE_CODES.has(event.code)) {
        return;
      }

      // Transient failure — reconnect if still logged in
      if (useAuthStore.getState().token) {
        reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // Will trigger onclose → reconnect
    };

    connectingRef.current = false;
  }, [handleMessage, queryClient]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, connect]);

  // Expose ws ref for send operations
  return wsRef;
}
