/**
 * Chat API client
 */

import { apiRequest, jsonRequest, API_BASE_URL } from "@/api/api";
import type { Conversation, ConversationDetail, ChatMessage } from "@/api/types/chat";

export async function getOrCreateConversation(postId: number): Promise<Conversation> {
  return jsonRequest<Conversation>("/messages/conversations", "POST", {
    post_id: postId,
  });
}

export async function getConversations(): Promise<Conversation[]> {
  return apiRequest<Conversation[]>("/messages/conversations");
}

export async function getConversationMessages(
  conversationId: number,
  beforeId?: number,
  limit: number = 50
): Promise<ConversationDetail> {
  const params = new URLSearchParams();
  if (beforeId !== undefined) params.set("before_id", String(beforeId));
  params.set("limit", String(limit));
  const query = params.toString();
  return apiRequest<ConversationDetail>(
    `/messages/conversations/${conversationId}?${query}`
  );
}

export async function sendMessageRest(
  conversationId: number,
  content: string
): Promise<ChatMessage> {
  return jsonRequest<ChatMessage>(
    `/messages/conversations/${conversationId}/messages`,
    "POST",
    { content }
  );
}

export async function getWsTicket(): Promise<string> {
  const data = await apiRequest<{ ticket: string }>("/messages/ws/ticket", {
    method: "POST",
  });
  return data.ticket;
}

export function getWebSocketUrl(ticket: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/messages/ws?ticket=${encodeURIComponent(ticket)}`;
}
