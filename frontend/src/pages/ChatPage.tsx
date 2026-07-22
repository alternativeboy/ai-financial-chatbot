import { Menu, Sparkles } from 'lucide-react';
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
import { useSmoothedText } from '../hooks/useSmoothedText';
import { cn } from '../lib/utils';
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
  // Covers the gap between the click and the first streamed byte: creating a
  // conversation is a round trip of its own, and without this the UI sits
  // unchanged through it.
  const [preparing, setPreparing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // A ref rather than the `busy` state: the guard has to be correct within a
  // single tick, before React has re-rendered.
  const busyRef = useRef(false);

  const busy = preparing || stream.isStreaming;

  // The model API delivers a reply in a few large bursts; this pays it out at a
  // steady rate so it reads as typing rather than as freeze-then-dump.
  const streamedMarkdown = useSmoothedText(stream.text, stream.isStreaming);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // The URL is the source of truth for which conversation is open, so a refresh
  // or a shared link lands on the same place.
  useEffect(() => {
    const id = conversationId ?? null;

    // Sending the first message of a new chat creates the conversation, which
    // moves the URL to /c/<id> and fires this effect mid-stream. The server has
    // already stored that user message, so refetching here would put it in
    // `messages` while the optimistic bubble is still on screen — the question
    // renders twice until the turn finishes and clears the optimistic copy.
    //
    // startConversation() has already pointed the store at this id, so there is
    // nothing to load: reading state directly (rather than adding activeId to
    // the deps) keeps this from re-running when the store changes.
    if (id !== null && id === useChatStore.getState().activeId) return;

    void openConversation(id).then((found) => {
      // The URL points at something that is gone; don't strand the user on a
      // blank page that still shows a dead id.
      if (!found) navigate('/chat', { replace: true });
    });
  }, [conversationId, navigate, openConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedMarkdown, stream.toolCalls, pendingUserMessage]);

  const handleSend = useCallback(
    async (content: string) => {
      // A second submission mid-turn would start an overlapping stream.
      if (busyRef.current) return;
      busyRef.current = true;

      // Paint the question and the indicator before touching the network, so a
      // tapped suggestion responds on the same frame rather than after a
      // conversation has been created.
      setPendingUserMessage(content);
      setPreparing(true);

      try {
        let targetId = activeId;
        if (!targetId) {
          const created = await startConversation();
          targetId = created.id;
          navigate(`/c/${created.id}`, { replace: true });
        }

        // Both the user turn and the assistant reply are expected to exist
        // server-side once this settles.
        const expectedCount = useChatStore.getState().messages.length + 2;

        await stream.send(targetId, content);

        // Fetch before clearing, not after. Clearing first empties the
        // optimistic bubble and the streamed text while `messages` is still the
        // old list — on a new chat that is an empty list, so the whole empty
        // state flashes back for the length of the round trip. Holding the
        // local copy until the server copy is in hand makes the swap invisible.
        //
        // Re-reading at all is what gives the message its real id, cost and
        // partial flag, and is why a refresh mid-stream shows no duplicates.
        await refreshMessages(expectedCount);
        setPendingUserMessage(null);
        stream.reset();

        // The title and ordering changed server-side on the first message.
        await loadConversations();
      } finally {
        setPreparing(false);
        busyRef.current = false;
      }
    },
    [activeId, loadConversations, navigate, refreshMessages, startConversation, stream],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const wasActive = pendingDelete.id === activeId;
    await removeConversation(pendingDelete.id);
    setPendingDelete(null);
    if (wasActive) navigate('/chat', { replace: true });
  }, [activeId, navigate, pendingDelete, removeConversation]);

  const showEmptyState = messages.length === 0 && !pendingUserMessage && !busy;

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Dark zone. Below lg it becomes a drawer. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[284px] bg-sidebar-dark transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
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
            navigate('/chat');
            setSidebarOpen(false);
          }}
        />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Light zone. */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-chat-surface">
        <header className="flex items-center gap-2 border-b px-3 py-2 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="truncate text-[14px] font-bold tracking-tight">
            Financial Data Chat
          </span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
            {showEmptyState && (
              <div className="relative mt-8">
                {/* Decorative only, and it holds still when the OS asks for
                    reduced motion (see the media query in index.css). */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 animate-orb-float rounded-full bg-emerald-soft"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-10 h-40 w-40 animate-particle rounded-full bg-emerald-soft"
                />

                <div className="relative">
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald shadow-green-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </span>
                  <h1 className="text-2xl font-extrabold tracking-tight lg:text-[28px]">
                    Ask about U.S. public company financials
                  </h1>
                  <p className="mt-2 text-[14.5px] text-muted-foreground">
                    Every answer is generated by querying the database, and the SQL is
                    shown alongside it.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSend(prompt)}
                        className="rounded-[11px] border bg-card px-3.5 py-2 text-[13px] text-muted-foreground shadow-card transition hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {pendingUserMessage && (
              <div className="flex justify-end">
                <div className="max-w-[520px] animate-in fade-in slide-in-from-bottom-3 whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald px-4 py-2.5 text-[14.5px] text-primary-foreground shadow-green">
                  {pendingUserMessage}
                </div>
              </div>
            )}

            {(busy || stream.text || stream.toolCalls.length > 0) && (
              <div className="flex max-w-[640px] flex-col">
                {stream.toolCalls.map((call, index) => (
                  <ToolCallWidget key={index} call={call} />
                ))}
                {streamedMarkdown ? (
                  <div className="relative">
                    <MarkdownRenderer content={streamedMarkdown} />
                    {stream.isStreaming && (
                      <span className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-caret bg-primary align-text-bottom" />
                    )}
                  </div>
                ) : (
                  busy &&
                  !stream.text && (
                    <StreamingIndicator
                      label={stream.toolCalls.length > 0 ? 'Reading results' : 'Thinking'}
                    />
                  )
                )}
              </div>
            )}

            {stream.error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[13px] text-destructive">
                {stream.error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <ChatInput
          disabled={busy}
          isStreaming={stream.isStreaming}
          onSend={(content) => void handleSend(content)}
          onStop={stream.stop}
        />
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
