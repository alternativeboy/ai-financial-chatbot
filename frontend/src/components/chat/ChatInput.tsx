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
    <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <TextArea
        rows={1}
        value={value}
        disabled={disabled}
        placeholder="Ask about revenue, net income, operating income or gross profit…"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className="max-h-40 min-h-[42px]"
      />
      {isStreaming ? (
        <Button variant="danger" onClick={onStop} className="shrink-0">
          Stop
        </Button>
      ) : (
        <Button onClick={submit} disabled={disabled || !value.trim()} className="shrink-0">
          Send
        </Button>
      )}
    </div>
  );
}
