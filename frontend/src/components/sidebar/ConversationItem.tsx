import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Conversation } from '../../types/chat.types';

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/**
 * Dark zone. --foreground / --muted-foreground belong to the light chat surface
 * and are unreadable here, so everything uses the sidebar-* tokens and hover is
 * a white wash rather than bg-muted.
 */
export function ConversationItem({ conversation, active, onSelect, onDelete }: Props) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-2 rounded-[11px] px-3 py-2 transition',
        active
          ? 'bg-sidebar-active/60 font-semibold text-sidebar-active-foreground'
          : 'font-normal text-sidebar-foreground hover:bg-white/[0.06]',
      )}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-2">
        {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-marker" />}
        <span className="truncate text-[13px]" title={conversation.title}>
          {conversation.title}
        </span>
      </span>

      <button
        type="button"
        aria-label={`Delete ${conversation.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="shrink-0 rounded-md p-1 text-sidebar-muted opacity-0 transition-opacity hover:text-sidebar-active-foreground focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
