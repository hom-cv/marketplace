/**
 * ChatView page - Single conversation with messages
 * Two-column layout: chat left, listing summary right
 */

import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { getConversationMessages } from "@/api/chat";
import { getPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { useSendMessage } from "@/hooks/useSendMessage";
import { Alert } from "@/components/Alert";
import { ChatHeader } from "./components/ChatHeader";
import { MessageBubble } from "./components/MessageBubble";
import { MessageInput } from "./components/MessageInput";
import { ListingSidebar } from "./components/ListingSidebar";
import type { ConversationDetail } from "@/api/types/chat";
import styles from "./ChatViewPage.module.css";

export function ChatViewPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const conversationId = params.conversationId
    ? parseInt(params.conversationId, 10)
    : null;
  const currentUser = useAuthStore((state) => state.user);
  const { t } = useTranslation("messages");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();

  // Lock body scroll while chat is mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () =>
      conversationId ? getConversationMessages(conversationId) : null,
    enabled: !!conversationId,
    staleTime: Infinity,
  });

  // Fetch full post data for the sidebar
  const { data: post } = useQuery({
    queryKey: ["post", conversation?.post.id],
    queryFn: () => (conversation?.post.id ? getPost(conversation.post.id) : null),
    enabled: !!conversation?.post.id,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const handleSend = useCallback(
    (content: string) => {
      if (!conversationId) return;
      sendMessage.mutate({ conversationId, content });
    },
    [conversationId, sendMessage]
  );

  const handleLoadOlder = useCallback(async () => {
    if (!conversationId || !conversation?.messages.length) return;

    const oldestId = conversation.messages[0].id;
    if (oldestId < 0) return;

    const container = messagesContainerRef.current;
    const scrollHeightBefore = container?.scrollHeight ?? 0;

    const older = await getConversationMessages(conversationId, oldestId, 50);

    if (older.messages.length > 0) {
      queryClient.setQueryData<ConversationDetail>(
        ["conversation", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...older.messages, ...old.messages],
            total_messages: older.total_messages,
          };
        }
      );

      requestAnimationFrame(() => {
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          container.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }
      });
    }
  }, [conversationId, conversation, queryClient]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <Alert variant="error">
            {error instanceof Error ? error.message : t("failedToLoad")}
          </Alert>
        </div>
      </div>
    );
  }

  const otherUser =
    conversation.initiator.id === currentUser?.id
      ? conversation.recipient
      : conversation.initiator;

  const hasOlderMessages =
    conversation.messages.length > 0 &&
    conversation.messages.length < conversation.total_messages;

  return (
    <div className={styles.page}>
      {/* Left: Chat */}
      <div className={styles.chatColumn}>
        <ChatHeader
          otherUser={otherUser}
          post={conversation.post}
          onBack={() => navigate({ to: "/messages" })}
        />

        <div className={styles.messagesArea} ref={messagesContainerRef}>
          {hasOlderMessages && (
            <button className={styles.loadOlderButton} onClick={handleLoadOlder}>
              {t("loadOlder")}
            </button>
          )}

          {conversation.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUser?.id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <MessageInput onSend={handleSend} disabled={sendMessage.isPending} />
      </div>

      {/* Right: Listing details */}
      <div className={styles.listingSidebar}>
        {post ? (
          <ListingSidebar post={post} />
        ) : (
          <div className={styles.loading}>
            <Loader size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
