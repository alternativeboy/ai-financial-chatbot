import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatInput } from '../components/chat/ChatInput';
import { ChatMessage } from '../components/chat/ChatMessage';
import { MarkdownRenderer } from '../components/chat/MarkdownRenderer';
import { StreamingIndicator } from '../components/chat/StreamingIndicator';
import { ToolCallWidget } from '../components/chat/ToolCallWidget';
import { ConversationList } from '../components/sidebar/ConversationList';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { useStreamChat } from '../hooks/useStreamChat';
import { useChatStore } from '../stores/chat.store';
import type { Conversation } from '../types/chat.types';

const EXAMPLE_PROMPTS = [
  "What was Apple's net income in 2023?",
  'Top 5 companies by revenue in 2024',
  'Average net income by sector',
  'Compare Microsoft and Google revenue from 2022 to 2025',
];

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeId);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const openConversation = useChatStore((s) => s.openConversation);
  const startConversation = useChatStore((s) => s.startConversation);
  const removeConversation = useChatStore((s) => s.removeConversation);
  const refreshMessages = useChatStore((s) => s.refreshMessages);

  const stream = useStreamChat();
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // The URL is the source of truth for which conversation is open, so a
  // refresh or a shared link lands on the same place.
  useEffect(() => {
    void openConversation(conversationId ?? null).then((found) => {
      // The URL points at something that is gone; don't strand the user on a
      // blank page that still shows a dead id.
      if (!found) navigate('/', { replace: true });
    });
  }, [conversationId, navigate, openConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, stream.text, stream.toolCalls, pendingUserMessage]);

  const handleSend = useCallback(
    async (content: string) => {
      let targetId = activeId;
      if (!targetId) {
        const created = await startConversation();
        targetId = created.id;
        navigate(`/c/${created.id}`, { replace: true });
      }

      // Both the user turn and the assistant reply are expected to exist
      // server-side once this settles.
      const expectedCount = useChatStore.getState().messages.length + 2;

      setPendingUserMessage(content);
      await stream.send(targetId, content);
      setPendingUserMessage(null);
      stream.reset();

      // Re-read from the server rather than trusting what was accumulated
      // locally: this is what gives the message its real id, cost and partial
      // flag, and it is why a refresh mid-stream shows no duplicates.
      await refreshMessages(expectedCount);
      // The title and ordering changed server-side on the first message.
      await loadConversations();
    },
    [
      activeId,
      loadConversations,
      navigate,
      refreshMessages,
      startConversation,
      stream,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const wasActive = pendingDelete.id === activeId;
    await removeConversation(pendingDelete.id);
    setPendingDelete(null);
    if (wasActive) navigate('/', { replace: true });
  }, [activeId, navigate, pendingDelete, removeConversation]);

  const showEmptyState =
    messages.length === 0 && !pendingUserMessage && !stream.isStreaming;

  return (
    <div className="flex h-dvh bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Sidebar: a drawer on phones, always visible from md up. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-slate-50 transition-transform dark:border-slate-700 dark:bg-slate-800 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => {
            navigate(`/c/${id}`);
            setSidebarOpen(false);
          }}
          onDelete={setPendingDelete}
          onNew={() => {
            navigate('/');
            setSidebarOpen(false);
          }}
        />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700 md:hidden">
          <Button variant="ghost" onClick={() => setSidebarOpen(true)}>
            ☰
          </Button>
          <span className="truncate text-sm font-medium">
            Financial Data Chat
          </span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
            {showEmptyState && (
              <div className="mt-10">
                <h1 className="text-xl font-semibold">
                  Ask about U.S. public company financials
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Every answer is generated by querying the database, and the SQL
                  is shown alongside it.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {pendingUserMessage && (
              <div className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900">
                  {pendingUserMessage}
                </div>
              </div>
            )}

            {(stream.isStreaming || stream.text || stream.toolCalls.length > 0) && (
              <div>
                {stream.toolCalls.map((call, index) => (
                  <ToolCallWidget key={index} call={call} />
                ))}
                {stream.text && <MarkdownRenderer content={stream.text} />}
                {stream.isStreaming && !stream.text && (
                  <StreamingIndicator
                    label={
                      stream.toolCalls.length > 0 ? 'Reading results' : 'Thinking'
                    }
                  />
                )}
              </div>
            )}

            {stream.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {stream.error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            disabled={stream.isStreaming}
            isStreaming={stream.isStreaming}
            onSend={(content) => void handleSend(content)}
            onStop={stream.stop}
          />
        </div>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete conversation?"
        description={`"${pendingDelete?.title ?? ''}" will be removed from your sidebar. This cannot be undone.`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
