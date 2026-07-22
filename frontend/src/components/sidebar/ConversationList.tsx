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
    <div className="flex h-full flex-col gap-2 p-3">
      <Button onClick={onNew} className="w-full">
        New chat
      </Button>

      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-slate-400">No conversations yet.</p>
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
  );
}
