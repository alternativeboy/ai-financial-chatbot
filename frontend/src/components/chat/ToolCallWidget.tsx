import { useMemo, useState } from 'react';
import type { LiveToolCall } from '../../types/chat.types';
import { CopyButton } from '../ui/copy-button';
import { findChartShape, ResultChart } from './ResultChart';

const PREVIEW_ROWS = 10;

/**
 * Shows the SQL the model ran and what came back.
 *
 * This is the app's honesty mechanism: the query is displayed verbatim next to
 * the answer, so a claimed figure can always be traced to the statement that
 * produced it.
 */
export function ToolCallWidget({ call }: { call: LiveToolCall }) {
  const [showChart, setShowChart] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const rows = call.rows ?? [];
  const chartShape = useMemo(() => findChartShape(rows), [rows]);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const visible = expanded ? rows : rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 dark:border-slate-700">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {call.name}
        </span>
        <CopyButton value={call.arguments} label="Copy SQL" />
      </div>

      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
        {call.arguments}
      </pre>

      {call.error ? (
        <p className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">
          Query rejected: {call.error}
        </p>
      ) : call.rows === undefined && call.rowCount === undefined ? (
        <p className="px-3 pb-2 text-xs text-slate-500 dark:text-slate-400">
          Running…
        </p>
      ) : call.rows === undefined ? (
        // Reloaded from history: the row count was stored, the rows were not.
        <p className="px-3 pb-2 text-xs text-slate-500 dark:text-slate-400">
          {call.rowCount} row{call.rowCount === 1 ? '' : 's'} returned
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-slate-500 dark:text-slate-400">
          No rows returned.
        </p>
      ) : (
        <div className="border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {call.rowCount} row{call.rowCount === 1 ? '' : 's'}
            </span>
            {call.truncated && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                truncated
              </span>
            )}
            {chartShape && (
              <button
                type="button"
                onClick={() => setShowChart((value) => !value)}
                className="underline-offset-2 hover:underline"
              >
                {showChart ? 'Show table' : 'Show chart'}
              </button>
            )}
          </div>

          {chartShape && showChart ? (
            <div className="px-2 pb-3">
              <ResultChart rows={rows} shape={chartShape} />
            </div>
          ) : (
            <div className="max-h-72 overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-3 py-1.5 font-semibold"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-200 dark:border-slate-700"
                    >
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="whitespace-nowrap px-3 py-1.5 font-mono"
                        >
                          {row[column] === null ? (
                            <span className="text-slate-400">NULL</span>
                          ) : (
                            String(row[column])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > PREVIEW_ROWS && (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  {expanded
                    ? 'Show fewer rows'
                    : `Show all ${rows.length} rows`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
