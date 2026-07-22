import type { Conversation } from '../../types/chat.types';

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
}: Props) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 ${
        active
          ? 'bg-slate-200 dark:bg-slate-700'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate py-2 text-left text-sm text-slate-700 dark:text-slate-200"
        title={conversation.title}
      >
        {conversation.title}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${conversation.title}`}
        className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-900/40"
      >
        ✕
      </button>
    </div>
  );
}
