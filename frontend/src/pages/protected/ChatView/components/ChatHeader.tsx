/**
 * Chat header with back button and other user info
 */

import { IconArrowLeft } from "@tabler/icons-react";
import type { ConversationParticipant, ConversationPost } from "@/api/types/chat";
import styles from "./ChatHeader.module.css";

interface ChatHeaderProps {
  otherUser: ConversationParticipant;
  post: ConversationPost;
  onBack: () => void;
}

export function ChatHeader({ otherUser, post, onBack }: ChatHeaderProps) {
  return (
    <div className={styles.header}>
      <button className={styles.backButton} onClick={onBack}>
        <IconArrowLeft size={20} />
      </button>

      <div className={styles.info}>
        <span className={styles.username}>@{otherUser.username}</span>
        <span className={styles.postTitle}>{post.title}</span>
      </div>
    </div>
  );
}
