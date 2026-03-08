import { useRef, useCallback, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { getAdminConversation } from "@/api/admin";
import type { ConversationDetail } from "@/api/types/chat";
import { formatShortDate } from "@/utils/date";
import type { ConversationGroup } from "@/api/types/admin";
import styles from "../FlaggedMessagesPage.module.css";

const MESSAGES_PAGE_LIMIT = 50;

interface ChatPaneProps {
  activeGroup: ConversationGroup;
  conversationDetail: ConversationDetail | undefined;
  chatLoading: boolean;
  senderNameMap: Map<number, string>;
  flaggedMessageIds: Set<number>;
}

export function ChatPane({
  activeGroup,
  conversationDetail,
  chatLoading,
  senderNameMap,
  flaggedMessageIds,
}: ChatPaneProps) {
  const queryClient = useQueryClient();
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const hasScrolledRef = useRef<number | null>(null);

  // Auto-scroll to first flagged message only once per conversation
  useEffect(() => {
    if (
      conversationDetail &&
      chatScrollRef.current &&
      hasScrolledRef.current !== activeGroup.conversationId
    ) {
      hasScrolledRef.current = activeGroup.conversationId;
      requestAnimationFrame(() => {
        const flaggedEl = chatScrollRef.current?.querySelector("[data-flagged='true']");
        if (flaggedEl) {
          flaggedEl.scrollIntoView({ block: "center" });
        }
      });
    }
  }, [conversationDetail, activeGroup.conversationId]);

  const handleLoadOlder = useCallback(async () => {
    if (!conversationDetail?.messages.length) return;

    const oldestId = conversationDetail.messages[0].id;
    if (oldestId < 0) return;

    const container = chatScrollRef.current;
    const scrollHeightBefore = container?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const older = await getAdminConversation(
        activeGroup.conversationId,
        oldestId,
        MESSAGES_PAGE_LIMIT,
      );
      if (older.messages.length > 0) {
        queryClient.setQueryData<ConversationDetail>(
          ["admin-conversation", activeGroup.conversationId],
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
    } catch (error) {
      console.error("Failed to load older messages:", error);
      notifications.show({ title: "Error", message: "Failed to load older messages", color: "red" });
    } finally {
      setLoadingOlder(false);
    }
  }, [activeGroup.conversationId, conversationDetail, queryClient]);

  const hasOlderMessages =
    conversationDetail &&
    conversationDetail.messages.length < conversationDetail.total_messages;

  return (
    <>
      <div className={styles.chatHeader}>
        <span className={styles.chatHeaderTitle}>
          {conversationDetail
            ? `${conversationDetail.initiator.username} & ${conversationDetail.recipient.username}`
            : activeGroup.senderUsernames.join(", ")}
        </span>
        {conversationDetail?.post && (
          <span className={styles.chatHeaderPost}>
            re: {conversationDetail.post.title}
          </span>
        )}
      </div>

      <div className={styles.chatArea} ref={chatScrollRef}>
        {chatLoading && (
          <div className={styles.chatLoading}>
            <Loader size="sm" />
          </div>
        )}
        {hasOlderMessages && (
          <button
            className={styles.loadOlderButton}
            onClick={handleLoadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? "Loading..." : "Load older messages"}
          </button>
        )}
        {conversationDetail?.messages.map((msg) => {
          const isFlagged = flaggedMessageIds.has(msg.id);
          const senderName = senderNameMap.get(msg.sender_id) ?? `User #${msg.sender_id}`;
          return (
            <div
              key={msg.id}
              className={`${styles.chatMsg} ${isFlagged ? styles.chatMsgFlagged : ""}`}
              data-flagged={isFlagged || undefined}
            >
              <div className={styles.chatMsgHeader}>
                <span className={styles.chatMsgSender}>{senderName}</span>
                <span className={styles.chatMsgTime}>
                  {formatShortDate(msg.created_date)}
                </span>
              </div>
              <div className={styles.chatMsgText}>{msg.content}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
