/**
 * Chat and messaging type definitions
 */

export interface ConversationParticipant {
  id: number;
  username: string;
}

export interface ConversationPost {
  id: number;
  title: string;
  image_url: string | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_date: string;
}

export interface Conversation {
  id: number;
  initiator: ConversationParticipant;
  recipient: ConversationParticipant;
  post: ConversationPost;
  last_message: ChatMessage | null;
  created_date: string;
}

export interface ConversationDetail {
  id: number;
  initiator: ConversationParticipant;
  recipient: ConversationParticipant;
  post: ConversationPost;
  messages: ChatMessage[];
  total_messages: number;
}

export interface WebSocketMessage {
  type: string;
  conversation_id?: number;
  content?: string;
  message?: ChatMessage;
  error?: string;
}
