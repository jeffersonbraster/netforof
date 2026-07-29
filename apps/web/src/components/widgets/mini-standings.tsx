import { SectionTitle } from "@/components/ui/section-title";
import type { MockStanding } from "@/lib/mock-data";

export function MiniStandings({ standings }: { standings: MockStanding[] }) {
  return (
    <section aria-label="Classificação do Brasileirão">
      <SectionTitle href="/classificacao" linkLabel="Tabela completa">
        Brasileirão
      </SectionTitle>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="py-2 font-medium">Time</th>
              <th className="px-3 py-2 text-right font-medium">P</th>
              <th className="px-3 py-2 text-right font-medium">J</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const isFortaleza = row.teamName === "Fortaleza";
              return (
                <tr
                  key={row.position}
                  className={`border-b border-line last:border-0 ${
                    isFortaleza ? "bg-primary/10 font-bold" : ""
                  }`}
                >
                  <td className="px-3 py-2 tabular-nums text-muted">{row.position}</td>
                  <td className="py-2">{row.teamName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.points}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{row.played}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
