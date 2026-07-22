import { ChevronDown, Database } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { LiveToolCall } from '../../types/chat.types';
import { CopyButton } from '../ui/copy-button';

/**
 * The SQL the model ran, shown next to its answer.
 *
 * This is the app's honesty mechanism, so it opens expanded while the query is
 * running: the requirement is that the SQL is *visible*, not that it can be
 * found by clicking around. Once rows come back it can be folded away.
 */
export function ToolCallWidget({ call }: { call: LiveToolCall }) {
  const running = call.rows === undefined && call.rowCount === undefined && !call.error;
  const [open, setOpen] = useState(true);
  const expanded = running || open;

  return (
    <div className="my-3 max-w-[640px] animate-in fade-in overflow-hidden rounded-[18px] border shadow-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={running}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 transition hover:bg-muted disabled:hover:bg-transparent"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-emerald">
            <Database className="h-3 w-3 text-white" />
          </span>
          <span className="font-mono text-[13px] font-semibold text-foreground">
            {call.name}
          </span>
          {running && <span className="text-xs text-muted-foreground">running…</span>}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {call.error ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[12px] font-semibold text-destructive">
              rejected
            </span>
          ) : (
            call.rowCount !== undefined && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[12px] font-semibold text-secondary-foreground">
                {call.rowCount} row{call.rowCount === 1 ? '' : 's'}
              </span>
            )
          )}
          {call.truncated && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[12px] font-semibold text-accent-foreground">
              truncated
            </span>
          )}
          {!running && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
          )}
        </span>
      </button>

      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-1 border-t bg-sql-dark duration-200">
          <div className="flex items-center justify-between px-4 pt-2.5">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-sidebar-label">
              query
            </span>
            <CopyButton value={call.arguments} label="Copy SQL" onDark />
          </div>
          <pre className="overflow-x-auto px-4 pb-3.5 pt-1.5 font-mono text-[12.5px] leading-relaxed text-sidebar-active-foreground">
            {call.arguments}
          </pre>
          {call.error && (
            <p className="border-t border-white/10 px-4 py-2 font-mono text-[12px] text-sidebar-muted">
              {call.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
