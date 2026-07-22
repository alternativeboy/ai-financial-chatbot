import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * remark-gfm is what turns the model's pipe tables into real tables — the
 * formatting rules in the system prompt ask for markdown tables whenever an
 * answer spans several companies or years.
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-slate max-w-none text-sm leading-relaxed text-slate-800 dark:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-700">
              {children}
            </code>
          ),
          // Wide tables scroll inside their own box rather than pushing the
          // page sideways on a phone.
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-300 px-3 py-2 font-semibold dark:border-slate-600">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
