import { Database, Plus } from 'lucide-react';
import type { Conversation } from '../../types/chat.types';
import { Button } from '../ui/button';
import { ConversationItem } from './ConversationItem';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (conversation: Conversation) => void;
  onNew: () => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald shadow-green">
          <Database className="h-4 w-4 text-white" />
        </span>
        <span className="text-[14px] font-extrabold tracking-tight text-sidebar-active-foreground">
          Financial Data
        </span>
      </div>

      <Button onClick={onNew} className="w-full">
        <Plus className="h-4 w-4" />
        New chat
      </Button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <span className="px-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-sidebar-label">
          Conversations
        </span>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-sidebar-muted">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeId}
                onSelect={() => onSelect(conversation.id)}
                onDelete={() => onDelete(conversation)}
              />
            ))
          )}
        </nav>
      </div>
    </div>
  );
}
