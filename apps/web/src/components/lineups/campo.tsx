import type { Lineup } from "@netfor/db";

import { nomeParaOCampo, posicionarTitulares } from "@/modules/lineups/campo";

/**
 * O campinho.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NÃO É VERDE
 * ---------------------------------------------------------------------------
 * A primeira versão desenhava gramado — verde saturado, faixas de corte, linhas
 * brancas. Parecia videogame, e brigava com o resto do portal: era a única
 * superfície do site que ignorava o tema claro/escuro e as duas âncoras do
 * tricolor.
 *
 * Esta versão trata a escalação como o que ela é: um gráfico de dados. Fundo do
 * próprio tema, marcações em hairline na cor de linha do sistema, e a cor
 * reservada para o que carrega informação — vermelho no Fortaleza, azul no
 * adversário, contorno vazado em quem saiu. É a mesma gramática do resto do
 * portal, e funciona nos dois temas sem nenhum valor fixo.
 *
 * Continua em CSS puro, sem imagem e sem biblioteca: são seis divs.
 *
 * O campo é sempre VERTICAL, com o gol defendido embaixo. Na horizontal, onze
 * nomes em 320px viram um borrão; na vertical cada linha ganha a largura inteira.
 * `aspect-[68/105]` é a proporção real de um campo oficial (68m × 105m).
 */

/** Marcações. `border-line` acompanha o tema — nada de branco fixo. */
function LinhasDoCampo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 text-line">
      <div className="absolute inset-x-0 top-1/2 h-px bg-current opacity-70" />
      {/* `w-[26%] aspect-square`, não `size-[26%]`: porcentagem em `height` é
          relativa à ALTURA do campo, que é bem maior que a largura — o círculo
          central saía oval. */}
      <div className="absolute top-1/2 left-1/2 w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-70">
        <div className="pt-[100%]" />
      </div>

      {/* Áreas de baixo (o gol defendido) e de cima. */}
      <div className="absolute bottom-0 left-1/2 h-[15%] w-[56%] -translate-x-1/2 border-x border-t border-current opacity-70" />
      <div className="absolute bottom-0 left-1/2 h-[5.5%] w-[26%] -translate-x-1/2 border-x border-t border-current opacity-70" />
      <div className="absolute top-0 left-1/2 h-[15%] w-[56%] -translate-x-1/2 border-x border-b border-current opacity-70" />
      <div className="absolute top-0 left-1/2 h-[5.5%] w-[26%] -translate-x-1/2 border-x border-b border-current opacity-70" />
    </div>
  );
}

function Jogador({
  numero,
  nome,
  posicao,
  saiu,
  x,
  y,
  cor,
}: {
  numero: number | null;
  nome: string;
  posicao: string | null;
  saiu: string | null;
  x: number;
  y: number;
  cor: "primaria" | "secundaria";
}) {
  const preenchimento =
    cor === "primaria" ? "bg-[var(--brand-red)]" : "bg-[var(--brand-blue)]";

  return (
    <div
      className="absolute flex w-[20%] -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1"
      // Posição vem de dado, não de classe: o Tailwind não gera utilitário para
      // valor calculado em tempo de execução.
      style={{ left: `${y}%`, bottom: `${x}%` }}
    >
      <span
        className={`font-display flex size-7 items-center justify-center rounded-full text-[13px] leading-none font-bold tabular-nums sm:size-8 sm:text-sm ${
          saiu
            ? // Quem saiu fica vazado: some do primeiro olhar sem desaparecer.
              "border border-line bg-surface text-muted"
            : `${preenchimento} text-white`
        }`}
      >
        {numero ?? "–"}
      </span>
      <span className="w-full text-center leading-tight">
        {/* `break-words` evita que um nome longo estoure a coluna em 320px. */}
        <span
          className={`block text-[10px] font-semibold break-words sm:text-[11px] ${
            saiu ? "text-muted" : "text-foreground"
          }`}
        >
          {nome}
        </span>
        {posicao && (
          <span className="block text-[9px] tracking-wide text-muted uppercase">{posicao}</span>
        )}
      </span>
    </div>
  );
}

export function CampoDeEscalacao({
  escalacao,
  cor = "primaria",
}: {
  escalacao: Lineup;
  cor?: "primaria" | "secundaria";
}) {
  const titulares = posicionarTitulares(escalacao.players, escalacao.formation);

  if (titulares.length === 0) {
    return (
      <p className="rounded-[--radius-card] border border-line bg-surface p-6 text-center text-sm text-muted">
        Escalação ainda não publicada para este time.
      </p>
    );
  }

  return (
    <figure className="m-0">
      {/* Cabeçalho do gráfico: time à esquerda, formação à direita, régua abaixo.
          Tabular para a formação não dançar entre um jogo e outro. */}
      <figcaption className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <span className="font-display truncate text-lg font-extrabold tracking-tight uppercase">
          {escalacao.teamName}
        </span>
        {escalacao.formation && (
          <span className="font-display shrink-0 text-sm tracking-[0.2em] text-muted tabular-nums">
            {escalacao.formation}
          </span>
        )}
      </figcaption>

      <div
        className="relative w-full overflow-hidden rounded-[--radius-card] border border-line bg-surface-2"
        style={{ aspectRatio: "68 / 105" }}
      >
        <LinhasDoCampo />

        {/*
          `<ul>` e não `<div>`: para leitor de tela isto é uma lista de onze
          jogadores. A posição visual é decoração; a ordem no DOM já sai do gol
          para o ataque, que é como alguém leria a escalação em voz alta.
        */}
        <ul className="absolute inset-0 list-none">
          {titulares.map((jogador) => (
            <li key={`${jogador.nome}-${jogador.casaNaFormacao}`}>
              <Jogador
                numero={jogador.camisa}
                nome={nomeParaOCampo(jogador)}
                posicao={jogador.posicao}
                saiu={jogador.substituidoPor}
                x={jogador.x}
                y={jogador.y}
                cor={cor}
              />
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

/** Reservas e substituições, embaixo do campo. */
export function BancoDeReservas({ escalacao }: { escalacao: Lineup }) {
  const reservas = escalacao.players.filter((j) => !j.titular);
  const trocas = escalacao.players.filter((j) => j.titular && j.substituidoPor);

  if (reservas.length === 0 && trocas.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 text-sm">
      {trocas.length > 0 && (
        <div>
          <h4 className="font-display mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">
            Substituições
          </h4>
          <ul className="space-y-1">
            {trocas.map((jogador) => (
              <li key={jogador.nome} className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-muted line-through">{nomeParaOCampo(jogador)}</span>
                <span className="text-muted" aria-label="substituído por">
                  →
                </span>
                <span className="font-medium">{jogador.substituidoPor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reservas.length > 0 && (
        <div>
          <h4 className="font-display mb-1.5 text-xs font-bold tracking-widest text-muted uppercase">
            Banco
          </h4>
          <p className="leading-relaxed text-muted">
            {reservas
              .map((j) => (j.camisa ? `${j.camisa} ${nomeParaOCampo(j)}` : nomeParaOCampo(j)))
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
