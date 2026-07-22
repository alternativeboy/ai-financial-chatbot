import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * remark-gfm is what turns the model's pipe tables into real tables — the
 * system prompt asks for a markdown table whenever an answer spans several
 * companies or years, and the chart is parsed back out of that same table.
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-[14.5px] leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          h1: ({ children }) => (
            <h1 className="mb-2 text-lg font-extrabold tracking-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-bold tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-[15px] font-bold">{children}</h3>
          ),
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children }) => (
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a href={href} className="font-semibold text-primary underline-offset-2 hover:underline">
              {children}
            </a>
          ),
          // Wide tables scroll inside their own box rather than pushing the page
          // sideways on a phone.
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-xl border">
              <table className="min-w-full border-collapse text-left text-[13px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-table-head">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-wide text-secondary-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="whitespace-nowrap border-t px-3 py-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
