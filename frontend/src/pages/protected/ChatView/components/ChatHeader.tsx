/**
 * Chat header with back button and other user info
 */

import { Link } from "@tanstack/react-router";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { ConversationParticipant, ConversationPost } from "@/api/types/chat";
import styles from "./ChatHeader.module.css";

interface ChatHeaderProps {
  otherUser: ConversationParticipant;
  post: ConversationPost;
  onBack: () => void;
}

export function ChatHeader({ otherUser, post, onBack }: ChatHeaderProps) {
  const { t } = useTranslation("messages");

  return (
    <div className={styles.header}>
      <button className={styles.backButton} onClick={onBack}>
        <IconArrowLeft size={20} />
      </button>

      <div className={styles.info}>
        <span className={styles.username}>@{otherUser.username}</span>
        <span className={styles.postTitle}>{post.title}</span>
      </div>

      <Link
        to="/explore/$postId"
        params={{ postId: String(post.id) }}
        className={styles.viewListingButton}
      >
        {t("viewListing")}
        <IconExternalLink size={14} />
      </Link>
    </div>
  );
}
