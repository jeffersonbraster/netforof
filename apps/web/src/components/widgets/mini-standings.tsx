import { SectionTitle } from "@/components/ui/section-title";
import type { Standing } from "@netfor/db";

export function MiniStandings({ standings }: { standings: Standing[] }) {
  if (standings.length === 0) return null;
  return (
    <section aria-label="Classificação">
      <SectionTitle href="/classificacao" linkLabel="Tabela completa">
        Série B
      </SectionTitle>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted uppercase">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="py-2 font-medium">Time</th>
              <th className="px-3 py-2 text-right font-medium">P</th>
              <th className="px-3 py-2 text-right font-medium">J</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const isFortaleza = row.teamName.toLowerCase().includes("fortaleza");
              return (
                <tr
                  key={row.position}
                  className={`border-b border-line last:border-0 ${
                    isFortaleza ? "bg-primary/10 font-bold" : ""
                  }`}
                >
                  <td className="px-3 py-2 tabular-nums text-muted">{row.position}</td>
                  <td className="truncate py-2">{row.teamName}</td>
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
