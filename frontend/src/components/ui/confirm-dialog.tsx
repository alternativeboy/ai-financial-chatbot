import { useEffect } from 'react';
import { Button } from './button';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex animate-in fade-in items-center justify-center bg-foreground/40 p-4 duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm animate-in zoom-in-95 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-frame duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
