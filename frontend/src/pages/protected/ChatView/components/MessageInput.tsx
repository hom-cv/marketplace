/**
 * Message input with send button
 */

import { useState, type KeyboardEvent } from "react";
import { IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "./MessageInput.module.css";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const { t } = useTranslation("messages");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.inputBar}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("inputPlaceholder")}
        rows={1}
        disabled={disabled}
      />
      <button
        className={styles.sendButton}
        onClick={handleSend}
        disabled={disabled || !value.trim()}
      >
        <IconSend size={18} />
      </button>
    </div>
  );
}
