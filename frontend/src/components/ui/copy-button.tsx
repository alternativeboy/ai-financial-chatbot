import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  value: string;
  label?: string;
  /** Set on the dark SQL panel, where foreground tokens are unreadable. */
  onDark?: boolean;
}

export function CopyButton({ value, label = 'Copy', onDark = false }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access is denied outside a secure context; a failed copy is
      // not worth interrupting the conversation over.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[12px] transition',
        onDark
          ? 'text-sidebar-muted hover:bg-white/[0.08] hover:text-sidebar-active-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
