import type { LiveToolCall, Message } from '../../types/chat.types';
import { CopyButton } from '../ui/copy-button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallWidget } from './ToolCallWidget';

/** Pairs stored tool calls with their stored results, position by position. */
function toLiveCalls(message: Message): LiveToolCall[] {
  return (message.toolCalls ?? []).map((call, index) => ({
    name: call.name,
    arguments: call.arguments,
    rowCount: message.toolResults?.[index]?.rowCount,
    error: message.toolResults?.[index]?.error,
  }));
}

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900">
          {message.content}
        </div>
      </div>
    );
  }

  const calls = toLiveCalls(message);

  return (
    <div className="group max-w-full">
      {calls.map((call, index) => (
        <ToolCallWidget key={index} call={call} />
      ))}

      {message.content && <MarkdownRenderer content={message.content} />}

      {message.isPartial && (
        <p className="mt-2 text-xs italic text-amber-600 dark:text-amber-400">
          interrupted — this reply was stopped before it finished
        </p>
      )}

      <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {message.content && (
          <CopyButton value={message.content} label="Copy answer" />
        )}
        {message.cost > 0 && (
          <span className="text-[11px] text-slate-400">
            ${message.cost.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
