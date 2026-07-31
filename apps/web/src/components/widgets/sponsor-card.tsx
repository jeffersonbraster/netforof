// Bloco de patrocínio direto (bets/lojas locais). Compliance Lei 14.790/2023
// e portarias SPA/MF: selo +18, jogo responsável e só casas licenciadas.
export function SponsorCard() {
  return (
    <section aria-label="Patrocínio">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex h-[200px] flex-col items-center justify-center gap-2 border-b border-line bg-surface-2/50 px-4 text-center">
          <span className="text-[10px] tracking-widest text-muted uppercase">Patrocínio</span>
          <p className="text-sm font-semibold">Anuncie sua marca aqui</p>
          <a
            href="mailto:contato@netfor.com.br"
            className="text-xs text-link underline underline-offset-4 hover:text-foreground"
          >
            contato@netfor.com.br
          </a>
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
            aria-hidden
          >
            18+
          </span>
          <p className="text-[10px] leading-snug text-muted">
            Apostas são para maiores de 18 anos. Jogue com responsabilidade — anunciamos apenas
            casas licenciadas pela SPA/MF.
          </p>
        </div>
      </div>
    </section>
  );
}
