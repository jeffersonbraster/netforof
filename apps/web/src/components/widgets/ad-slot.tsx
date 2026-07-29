// Espaço reservado com altura fixa — evita layout shift quando o AdSense
// for plugado na Fase 8 (CLS = 0 é meta do plano, seção 7).
export function AdSlot({
  format,
  label = "Publicidade",
}: {
  format: "leaderboard" | "rectangle";
  label?: string;
}) {
  const dimensions =
    format === "leaderboard" ? "h-[100px] md:h-[90px] w-full" : "h-[250px] w-full max-w-[336px]";
  return (
    <div
      className={`mx-auto flex items-center justify-center rounded-lg border border-dashed border-line bg-surface-2/50 ${dimensions}`}
      role="complementary"
      aria-label={label}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}
