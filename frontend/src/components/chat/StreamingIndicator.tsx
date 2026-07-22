export function StreamingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-dot"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="font-mono text-[13px] font-semibold text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-[15px] w-[480px] max-w-full animate-shimmer rounded-lg bg-shimmer bg-[length:200%_100%]" />
        <div className="h-[15px] w-[340px] max-w-full animate-shimmer rounded-lg bg-shimmer bg-[length:200%_100%]" />
      </div>
    </div>
  );
}
