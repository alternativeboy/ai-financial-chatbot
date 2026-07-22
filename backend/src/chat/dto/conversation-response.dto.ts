import { Conversation } from '../entities/conversation.entity';
import {
  Message,
  MessageRole,
  StoredToolCall,
  StoredToolResult,
} from '../entities/message.entity';

export interface ConversationResponse {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedConversations {
  data: ConversationResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  toolCalls: StoredToolCall[] | null;
  toolResults: StoredToolResult[] | null;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  isPartial: boolean;
  createdAt: Date;
}

/**
 * Entities are mapped explicitly rather than serialised wholesale. sessionId is
 * the only credential in this system: echoing it back in a response body would
 * put it somewhere a client-side script or a logged payload could pick it up,
 * and holding it is equivalent to owning every conversation in that session.
 */
export function toConversationResponse(
  conversation: Conversation,
): ConversationResponse {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    cost: message.cost,
    isPartial: message.isPartial,
    createdAt: message.createdAt,
  };
}
