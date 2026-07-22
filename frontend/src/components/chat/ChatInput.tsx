import { ArrowUp, Square } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Button } from '../ui/button';
import { TextArea } from '../ui/input';

interface Props {
  disabled: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

export function ChatInput({ disabled, isStreaming, onSend, onStop }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter is a newline — the convention every chat UI uses.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-card">
        <TextArea
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Ask about revenue, net income, operating income or gross profit…"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-[44px] border-0 bg-transparent px-2 focus:ring-0"
        />
        {isStreaming ? (
          <Button variant="destructive" size="icon" onClick={onStop} aria-label="Stop">
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send"
            className="animate-glow"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
