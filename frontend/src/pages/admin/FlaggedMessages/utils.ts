import type { MessageFlag, ConversationGroup } from "@/api/types/admin";

export function groupByConversation(flags: MessageFlag[]): ConversationGroup[] {
  const map = new Map<number, MessageFlag[]>();
  for (const flag of flags) {
    const existing = map.get(flag.conversation_id);
    if (existing) {
      existing.push(flag);
    } else {
      map.set(flag.conversation_id, [flag]);
    }
  }

  const groups: ConversationGroup[] = [];
  for (const [conversationId, convFlags] of map) {
    const sorted = convFlags.sort(
      (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
    const pendingCount = sorted.filter((f) => f.status === "PENDING").length;

    const senderMap = new Map<number, string>();
    const senderCounts = new Map<number, number>();
    for (const f of sorted) {
      if (!senderMap.has(f.sender_id)) {
        senderMap.set(f.sender_id, f.sender_username);
      }
      senderCounts.set(f.sender_id, (senderCounts.get(f.sender_id) ?? 0) + 1);
    }

    let primarySenderId = sorted[0].sender_id;
    let maxCount = 0;
    for (const [id, count] of senderCounts) {
      if (count > maxCount) {
        maxCount = count;
        primarySenderId = id;
      }
    }

    groups.push({
      conversationId,
      senderUsernames: [...senderMap.values()],
      senderIds: [...senderMap.keys()],
      primarySenderId,
      flags: sorted,
      pendingCount,
      latestDate: sorted[0].created_date,
    });
  }

  return groups.sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
}
