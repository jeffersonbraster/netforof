type BadgeVariant = "category" | "source" | "live" | "neutral";

const styles: Record<BadgeVariant, string> = {
  category: "bg-secondary/15 text-link border-secondary/30",
  source: "bg-surface-2 text-muted border-line",
  live: "bg-primary/15 text-primary-text border-primary/40",
  neutral: "bg-surface-2 text-foreground border-line",
};

export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${styles[variant]}`}
    >
      {variant === "live" && (
        <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
      )}
      {children}
    </span>
  );
}
