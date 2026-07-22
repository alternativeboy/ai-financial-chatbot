import { create } from 'zustand';
import { ApiError } from '../services/api';
import { chatService } from '../services/chat.service';
import type { Conversation, Message } from '../types/chat.types';

interface ChatState {
  conversations: Conversation[];
  messages: Message[];
  activeId: string | null;
  loadingMessages: boolean;

  loadConversations: () => Promise<void>;
  /** Resolves false when the conversation no longer exists. */
  openConversation: (id: string | null) => Promise<boolean>;
  startConversation: () => Promise<Conversation>;
  removeConversation: (id: string) => Promise<void>;
  refreshMessages: (expectAtLeast?: number) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: [],
  activeId: null,
  loadingMessages: false,

  loadConversations: async () => {
    const page = await chatService.listConversations();
    set({ conversations: page.data });
  },

  openConversation: async (id) => {
    set({ activeId: id, messages: [] });
    if (!id) return true;

    set({ loadingMessages: true });
    try {
      const messages = await chatService.listMessages(id);
      // Guard against a slow response for a conversation the user has since
      // navigated away from overwriting the one now on screen.
      if (get().activeId === id) set({ messages });
      return true;
    } catch (error) {
      // A deleted conversation, or a bookmarked link from another session, is
      // an ordinary outcome — the server answers 404 by design. Report it so
      // the caller can send the user somewhere real, rather than letting it
      // surface as an uncaught rejection.
      if (error instanceof ApiError && error.status === 404) {
        if (get().activeId === id) set({ activeId: null, messages: [] });
        return false;
      }
      throw error;
    } finally {
      set({ loadingMessages: false });
    }
  },

  startConversation: async () => {
    const conversation = await chatService.createConversation();
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeId: conversation.id,
      messages: [],
    }));
    return conversation;
  },

  removeConversation: async (id) => {
    await chatService.deleteConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      ...(state.activeId === id ? { activeId: null, messages: [] } : {}),
    }));
  },

  /**
   * Re-reads the turn from the server once streaming ends, so what stays on
   * screen is the persisted row — ids, cost and the partial flag included —
   * rather than the locally accumulated copy. This is also why a refresh
   * mid-stream neither duplicates nor loses anything.
   */
  refreshMessages: async (expectAtLeast) => {
    const { activeId } = get();
    if (!activeId) return;

    // When a turn is interrupted the client learns of it the instant the socket
    // closes, which is *before* the server has finished writing the partial
    // reply. Fetching once would then render a conversation missing its last
    // message until something else triggered a reload. Poll briefly for the row
    // to land. A completed turn is already persisted before `done` is sent, so
    // this returns on the first attempt.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const messages = await chatService.listMessages(activeId);
      if (get().activeId !== activeId) return;
      set({ messages });
      if (expectAtLeast === undefined || messages.length >= expectAtLeast) return;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  },
}));
