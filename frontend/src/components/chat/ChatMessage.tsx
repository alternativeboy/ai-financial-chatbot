import { useMemo } from 'react';
import type { LiveToolCall, Message } from '../../types/chat.types';
import { CopyButton } from '../ui/copy-button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseFirstTable, ResultChart } from './ResultChart';
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
  const chart = useMemo(
    () => (message.content ? parseFirstTable(message.content) : null),
    [message.content],
  );

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[520px] animate-in fade-in slide-in-from-bottom-3 whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald px-4 py-2.5 text-[14.5px] text-primary-foreground shadow-green">
          {message.content}
        </div>
      </div>
    );
  }

  const calls = toLiveCalls(message);

  return (
    <div className="group/msg flex max-w-[640px] animate-in fade-in slide-in-from-bottom-3 flex-col">
      {calls.map((call, index) => (
        <ToolCallWidget key={index} call={call} />
      ))}

      {message.content && <MarkdownRenderer content={message.content} />}

      {/* Under the table it was parsed from, never instead of it: the table is
          what keeps the chart accessible when the brand green alone would not
          carry enough contrast. */}
      {chart && <ResultChart series={chart} />}

      {message.isPartial && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          interrupted — this reply was stopped before it finished
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity group-hover/msg:opacity-100">
        {message.content && <CopyButton value={message.content} label="Copy answer" />}
        {message.cost > 0 && (
          <span className="font-mono text-[12px] text-muted-foreground">
            ${message.cost.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
