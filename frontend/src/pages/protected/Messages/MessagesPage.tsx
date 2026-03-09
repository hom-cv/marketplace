/**
 * Messages page - List of all conversations
 */

import { Link } from "@tanstack/react-router";
import { Loader } from "@mantine/core";
import { IconMessage, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useConversations } from "@/hooks/useChat";
import { useAuthStore } from "@/stores/authStore";
import { Alert } from "@/components/Alert";
import type { Conversation } from "@/api/types/chat";
import shared from "@/styles/listPage.module.css";
import styles from "./MessagesPage.module.css";

function formatTime(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return t("yesterday");
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessagesPage() {
  const { t } = useTranslation("messages");
  const currentUser = useAuthStore((state) => state.user);

  const {
    data: conversations,
    isLoading,
    error,
  } = useConversations();

  if (isLoading) {
    return (
      <div className={shared.page}>
        <div className={shared.loading}>
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shared.page}>
        <div className={shared.container}>
          <Alert variant="error">
            {error instanceof Error ? error.message : t("failedToLoad")}
          </Alert>
        </div>
      </div>
    );
  }

  const getOtherUser = (conv: Conversation) =>
    conv.initiator.id === currentUser?.id ? conv.recipient : conv.initiator;

  return (
    <div className={shared.page}>
      <div className={shared.container}>
        <h1 className={shared.title}>{t("title")}</h1>

        {!conversations || conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <IconMessage size={48} stroke={1.5} className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t("noConversations")}</p>
            <Link to="/explore" className={styles.exploreLink}>
              {t("browseListings")}
            </Link>
          </div>
        ) : (
          <div className={shared.list}>
            {conversations.map((conv) => {
              const otherUser = getOtherUser(conv);
              return (
                <Link
                  key={conv.id}
                  to="/messages/$conversationId"
                  params={{ conversationId: String(conv.id) }}
                  className={styles.conversationItem}
                >
                  <div className={styles.postThumbnail}>
                    {conv.post.image_url ? (
                      <img
                        src={conv.post.image_url}
                        alt={conv.post.title}
                        className={styles.thumbnailImage}
                      />
                    ) : (
                      <IconPhoto size={20} className={styles.thumbnailPlaceholder} />
                    )}
                  </div>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationHeader}>
                      <span className={styles.username}>@{otherUser.username}</span>
                      <span className={styles.time}>
                        {conv.last_message
                          ? formatTime(conv.last_message.created_date, t)
                          : formatTime(conv.created_date, t)}
                      </span>
                    </div>
                    <div className={styles.postTitle}>{conv.post.title}</div>
                    {conv.last_message && (
                      <p className={styles.preview}>
                        {conv.last_message.sender_id === currentUser?.id
                          ? `${t("you")}: `
                          : ""}
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
