import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import { getFlaggedMessages, getAdminConversation } from "@/api/admin";
import { getPost } from "@/api/posts";
import { Alert } from "@/components/Alert";
import { ConversationList } from "./FlaggedMessages/ConversationList";
import { ChatPane } from "./FlaggedMessages/ChatPane";
import { DetailPane } from "./FlaggedMessages/DetailPane";
import { groupByConversation } from "./FlaggedMessages/utils";
import styles from "./FlaggedMessagesPage.module.css";

const MESSAGES_PAGE_LIMIT = 50;

export function FlaggedMessagesPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<number | null>(null);

  const { data: flagsData, isLoading, error } = useQuery({
    queryKey: ["adminFlaggedMessages", statusFilter],
    queryFn: () => getFlaggedMessages(statusFilter || undefined),
  });

  const groups = useMemo(
    () => groupByConversation(flagsData?.items ?? []),
    [flagsData]
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.conversationId === selectedConv) ?? null,
    [groups, selectedConv]
  );

  const { data: conversationDetail, isLoading: chatLoading } = useQuery({
    queryKey: ["adminConversation", selectedConv],
    queryFn: () => getAdminConversation(selectedConv!, undefined, MESSAGES_PAGE_LIMIT),
    enabled: selectedConv !== null,
    staleTime: Infinity,
  });

  const { data: convPost } = useQuery({
    queryKey: ["adminConversationPost", conversationDetail?.post.id],
    queryFn: async () => {
      try {
        return await getPost(conversationDetail!.post.id);
      } catch (error) {
        console.error("Failed to fetch post for admin review:", error);
        return null;
      }
    },
    enabled: !!conversationDetail?.post.id,
    staleTime: Infinity,
  });

  function handleSelectConv(conversationId: number) {
    if (selectedConv === conversationId) return;
    setSelectedConv(conversationId);
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error instanceof Error ? error.message : "Failed to load flagged messages"}
      </Alert>
    );
  }

  // Build sender name lookup from conversation participants + flags
  const senderNameMap = new Map<number, string>();
  if (activeGroup) {
    for (const f of activeGroup.flags) {
      senderNameMap.set(f.sender_id, f.sender_username);
    }
  }
  if (conversationDetail) {
    senderNameMap.set(conversationDetail.initiator.id, conversationDetail.initiator.username);
    senderNameMap.set(conversationDetail.recipient.id, conversationDetail.recipient.username);
  }

  const flaggedMessageIds = activeGroup
    ? new Set(activeGroup.flags.map((f) => f.message_id))
    : new Set<number>();

  const allPatterns = activeGroup
    ? [...new Set(activeGroup.flags.flatMap((f) => f.matched_patterns))]
    : [];

  return (
    <div className={styles.layout}>
      <ConversationList
        groups={groups}
        totalFlags={flagsData?.total ?? 0}
        selectedConv={selectedConv}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSelectConversation={handleSelectConv}
      />

      <div className={styles.chatPane}>
        {!activeGroup ? (
          <div className={styles.chatEmpty}>
            Select a conversation to review
          </div>
        ) : (
          <ChatPane
            activeGroup={activeGroup}
            conversationDetail={conversationDetail}
            chatLoading={chatLoading}
            senderNameMap={senderNameMap}
            flaggedMessageIds={flaggedMessageIds}
          />
        )}
      </div>

      {activeGroup && (
        <DetailPane
          activeGroup={activeGroup}
          post={convPost}
          isLoading={chatLoading}
          allPatterns={allPatterns}
          senderNameMap={senderNameMap}
        />
      )}
    </div>
  );
}
