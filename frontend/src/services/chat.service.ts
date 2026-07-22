import type { Conversation, Message, Paginated } from '../types/chat.types';
import { request } from './api';

export const chatService = {
  listConversations: (page = 1, limit = 50) =>
    request<Paginated<Conversation>>(
      `/conversations?page=${page}&limit=${limit}`,
    ),

  createConversation: () =>
    request<Conversation>('/conversations', { method: 'POST' }),

  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),

  listMessages: (id: string) =>
    request<Message[]>(`/conversations/${id}/messages`),

  deleteConversation: (id: string) =>
    request<{ message: string }>(`/conversations/${id}`, { method: 'DELETE' }),
};
