import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60 ${className}`}
    >
      {children}
    </div>
  );
}
