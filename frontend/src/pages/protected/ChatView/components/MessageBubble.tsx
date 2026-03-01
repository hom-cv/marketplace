/**
 * Single message bubble
 */

import type { ChatMessage } from "@/api/types/chat";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isOptimistic = message.id < 0;

  return (
    <div
      className={[styles.row, isOwn ? styles.rowOwn : styles.rowOther].join(" ")}
    >
      <div
        className={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          isOptimistic ? styles.optimistic : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className={styles.content}>{message.content}</p>
        <span className={styles.time}>
          {formatMessageTime(message.created_date)}
        </span>
      </div>
    </div>
  );
}
