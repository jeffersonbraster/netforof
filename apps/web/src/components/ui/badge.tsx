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
    // `whitespace-nowrap shrink-0` não é enfeite: `.font-display` carrega
    // `overflow-wrap: anywhere` (regra de manchete, para nome de clube composto
    // não estourar em 320px). Num selo isso vira "ENCERRA/DO" em duas linhas
    // assim que o vizinho aperta — foi o que aconteceu no cartão de jogo do
    // celular, com dois por linha. Rótulo curto não quebra: ou cabe, ou o
    // vizinho é quem cede (todos os vizinhos têm `truncate`).
    <span
      className={`inline-flex shrink-0 items-center gap-1 border px-2 py-0.5 font-display text-[11px] font-bold tracking-wide whitespace-nowrap uppercase ${variant === "live" ? "rounded-full" : ""} ${styles[variant]}`}
    >
      {variant === "live" && (
        <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
      )}
      {children}
    </span>
  );
}
