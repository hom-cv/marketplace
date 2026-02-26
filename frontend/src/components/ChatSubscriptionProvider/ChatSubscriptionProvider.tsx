/**
 * Invisible component that manages the WebSocket chat subscription.
 * Renders nothing - just runs the hook at app root level.
 */

import { useEffect } from "react";
import { useIsAuthenticated } from "@/stores/authStore";
import { useChatSubscription, setGlobalWsRef } from "@/hooks/useChatSubscription";

export function ChatSubscriptionProvider() {
  const isAuthenticated = useIsAuthenticated();

  // Only connect when authenticated
  if (!isAuthenticated) return null;

  return <ChatSubscriptionInner />;
}

function ChatSubscriptionInner() {
  const wsRef = useChatSubscription();

  useEffect(() => {
    setGlobalWsRef(wsRef);
  }, [wsRef]);

  return null;
}
