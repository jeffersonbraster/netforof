import type { Match } from "@netfor/db";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { sessaoValida } from "@/lib/admin-auth";
import { formatKickoff } from "@/lib/format";
import { listarJogosDoPainel } from "@/modules/admin/queries";

import { salvarPlacar } from "../actions";
import { Aviso, Botao, Cartao, Selecao, Selo, TituloDaTela, Vazio } from "../ui";

export default function JogosPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Escudo do time.
 *
 * 26px é o mesmo tamanho que a /agenda pede ao otimizador — pedir 28 aqui criaria
 * uma segunda transformação da mesma imagem, cobrada à parte, para uma diferença
 * que ninguém enxerga.
 *
 * `alt=""` porque o nome do time vem no `<span>` ao lado: no celular ele fica
 * visualmente escondido, mas continua no DOM para leitor de tela. Botar o nome
 * também no alt faria a leitura sair dobrada no desktop.
 */
function Escudo({ src }: { src: string | null }) {
  if (!src) {
    return <span className="size-[26px] shrink-0 rounded-[--radius-pill] bg-surface-2" aria-hidden />;
  }
  return (
    <Image
      src={src}
      alt=""
      width={26}
      height={26}
      className="size-[26px] shrink-0 object-contain"
    />
  );
}

/**
 * Nome do time: escondido no celular, onde só o escudo cabe, mas sempre presente
 * para tecnologia assistiva (`sr-only` esconde à vista, não do DOM).
 */
function NomeDoTime({ nome, alinhamento }: { nome: string; alinhamento: "esquerda" | "direita" }) {
  const doLeao = nome.toLowerCase().includes("fortaleza");
  return (
    <span
      className={`sr-only min-w-0 flex-1 truncate text-sm sm:not-sr-only ${
        alinhamento === "direita" ? "sm:text-right" : ""
      } ${doLeao ? "font-semibold" : "text-muted"}`}
    >
      {nome}
    </span>
  );
}

function CartaoDeJogo({ jogo, emCampo = false }: { jogo: Match; emCampo?: boolean }) {
  const rotuloEstado =
    jogo.status === "live" ? "Ao vivo" : jogo.status === "finished" ? "Encerrado" : "Agendado";

  return (
    <Cartao className={`p-3 sm:p-4 ${emCampo ? "border-primary/50" : ""}`}>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-wide text-muted uppercase">
        <span className="truncate">{jogo.competition}</span>
        <span aria-hidden>·</span>
        <span className="whitespace-nowrap">{formatKickoff(jogo.kickoffAt)}</span>
        {jogo.status === "live" && <Selo tom="vivo">Ao vivo</Selo>}
        {emCampo && jogo.status !== "live" && <Selo tom="ativo">Aguardando placar</Selo>}
      </div>

      {/*
        Uma linha de placar e uma de controles. No celular a de placar é
        escudo–número–×–número–escudo, que cabe em 320px com folga; a partir de
        `sm` os nomes aparecem e a linha se abre.
      */}
      <form action={salvarPlacar} className="space-y-3">
        <input type="hidden" name="id" value={jogo.id} />

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5">
            <NomeDoTime nome={jogo.homeTeam} alinhamento="direita" />
            <Escudo src={jogo.homeLogo} />
          </div>

          <input
            name="homeScore"
            inputMode="numeric"
            maxLength={2}
            defaultValue={jogo.homeScore ?? ""}
            aria-label={`Gols de ${jogo.homeTeam}`}
            className="font-display h-10 w-12 shrink-0 rounded-[--radius-card] border border-line bg-background text-center text-lg font-bold tabular-nums hover:border-primary/40 focus:border-primary/60"
          />
          <span className="shrink-0 text-sm text-muted" aria-hidden>
            ×
          </span>
          <input
            name="awayScore"
            inputMode="numeric"
            maxLength={2}
            defaultValue={jogo.awayScore ?? ""}
            aria-label={`Gols de ${jogo.awayTeam}`}
            className="font-display h-10 w-12 shrink-0 rounded-[--radius-card] border border-line bg-background text-center text-lg font-bold tabular-nums hover:border-primary/40 focus:border-primary/60"
          />

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <Escudo src={jogo.awayLogo} />
            <NomeDoTime nome={jogo.awayTeam} alinhamento="esquerda" />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line pt-3">
          <Selecao
            name="estado"
            defaultValue={jogo.status}
            aria-label={`Estado de ${jogo.homeTeam} × ${jogo.awayTeam} (atual: ${rotuloEstado})`}
            className="h-9 flex-1 py-0 sm:max-w-44"
          >
            <option value="scheduled">Agendado</option>
            <option value="live">Ao vivo</option>
            <option value="finished">Encerrado</option>
          </Selecao>
          <Botao type="submit" variante={emCampo ? "primario" : "secundario"}>
            Salvar
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}

function Grupo({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display mb-1 text-sm font-bold tracking-widest uppercase">{titulo}</h2>
      {descricao && <p className="mb-3 text-xs text-muted">{descricao}</p>}
      <div className={descricao ? "space-y-3" : "mt-3 space-y-3"}>{children}</div>
    </section>
  );
}

async function Painel({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  if (!(await sessaoValida())) redirect("/admin/login");
  const { salvo } = await searchParams;

  const { emCampo, proximos, encerrados } = await listarJogosDoPainel();

  return (
    <>
      <TituloDaTela descricao="A coleta da ESPN roda por cron e pode atrasar em dia de jogo. Aqui você corrige na hora — a coleta seguinte sobrescreve com o dado oficial quando atualizar.">
        Jogos
      </TituloDaTela>

      {salvo && <Aviso>Placar salvo.</Aviso>}

      {emCampo.length > 0 && (
        <Grupo
          titulo="Em campo agora"
          descricao="Já começou e ainda não foi encerrado. É aqui que o placar entra à mão enquanto a ESPN não atualiza."
        >
          {emCampo.map((jogo) => (
            <CartaoDeJogo key={jogo.id} jogo={jogo} emCampo />
          ))}
        </Grupo>
      )}

      <Grupo titulo="Próximos">
        {proximos.length === 0 ? (
          <Vazio>Nenhum jogo agendado à frente. A coleta da ESPN preenche sozinha.</Vazio>
        ) : (
          proximos.map((jogo) => <CartaoDeJogo key={jogo.id} jogo={jogo} />)
        )}
      </Grupo>

      <Grupo titulo="Encerrados" descricao="Últimas três semanas.">
        {encerrados.length === 0 ? (
          <Vazio>Sem resultados nas últimas três semanas.</Vazio>
        ) : (
          encerrados.map((jogo) => <CartaoDeJogo key={jogo.id} jogo={jogo} />)
        )}
      </Grupo>
    </>
  );
}
