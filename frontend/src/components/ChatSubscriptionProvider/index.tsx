/**
 * Provider that manages the WebSocket chat subscription
 * and exposes the WS ref via React Context.
 */

import type { ReactNode } from "react";
import { useIsAuthenticated } from "@/stores/authStore";
import {
  useChatSubscription,
  ChatWebSocketContext,
} from "@/hooks/useChatSubscription";

interface ChatSubscriptionProviderProps {
  children: ReactNode;
}

export function ChatSubscriptionProvider({ children }: ChatSubscriptionProviderProps) {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) return <>{children}</>;

  return <ChatSubscriptionInner>{children}</ChatSubscriptionInner>;
}

function ChatSubscriptionInner({ children }: ChatSubscriptionProviderProps) {
  const wsRef = useChatSubscription();

  return (
    <ChatWebSocketContext.Provider value={wsRef}>
      {children}
    </ChatWebSocketContext.Provider>
  );
}
