import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function TextArea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        'w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-[14.5px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:bg-muted',
        className,
      )}
    />
  );
}
