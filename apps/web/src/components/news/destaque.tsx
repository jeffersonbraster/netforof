import Link from "next/link";
import type { DestaqueLayout } from "@netfor/db";

import { HeroCard } from "@/components/news/news-card";
import { SpotlightCard } from "@/components/news/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { formatShortDateTime } from "@/lib/format";
import type { ArticleCard } from "@/modules/news/types";

/**
 * Os quatro arquétipos da área de destaque da home.
 *
 * O `design.md` do projeto lista "o arquétipo de destaque da home" como uma das
 * duas coisas que podem variar dentro do sistema travado. Estes são eles, na
 * ordem de intensidade — de três assuntos dividindo a atenção a um só
 * interrompendo o dia.
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE VALE PARA OS QUATRO: TEXTO NÃO VAI SOBRE FOTO CLARA
 * ---------------------------------------------------------------------------
 * A manchete já abandonou sobreposição uma vez, e o motivo está escrito no
 * `news-card.tsx`: degradê é bonito quando a foto é escura e o título é curto, e
 * quebra nos dois casos contrários — no tema claro o texto branco some, e título
 * longo transborda a área da imagem. Onde há texto sobre imagem aqui (o
 * `SpotlightCard`, herdado), o véu é opaco por si só, não dependente da foto.
 *
 * Por isso a faixa `uber` não é "foto com título por cima": é um campo de tinta
 * sólido AO LADO da foto. O impacto vem da estrutura — sangra a margem, canto
 * reto, cor de marca cheia —, não de um degradê que pode falhar.
 */

/** Modo 1 — manchete grande e duas ao lado. O que o portal já fazia. */
function TresMaterias({ destaques }: { destaques: ArticleCard[] }) {
  const [manchete, ...laterais] = destaques;
  if (!manchete) return null;

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <HeroCard article={manchete} />
      {laterais.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {laterais.map((article) => (
            <SpotlightCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Modo 2 — duas manchetes de peso igual.
 *
 * `minmax(0,1fr)` e não `1fr`: coluna com imagem dentro estoura a grade quando o
 * conteúdo tem largura mínima maior que a fração. É a mesma armadilha que já
 * quebrou o selo de "encerrado" no celular.
 */
function DuasMaterias({ destaques }: { destaques: ArticleCard[] }) {
  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {destaques.map((article, indice) => (
        <article
          key={article.id}
          className="group flex h-full flex-col overflow-hidden rounded-[--radius-card] border border-line bg-surface transition-colors hover:border-primary"
        >
          <Link href={`/noticias/${article.slug}`} className="flex h-full flex-col">
            <div className="relative aspect-video overflow-hidden">
              <RemoteImage
                src={article.imageUrl}
                sizes="(max-width: 1024px) 100vw, 560px"
                // Só a primeira entra no LCP; a segunda carrega normal.
                priority={indice === 0}
                quality={indice === 0 ? 60 : 75}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              {article.category && (
                <div>
                  <Badge variant="category">{article.category}</Badge>
                </div>
              )}
              <h2 className="font-display text-2xl leading-[1.08] font-extrabold tracking-tight group-hover:text-primary-text sm:text-[2rem]">
                {article.title}
              </h2>
              <p className="line-clamp-3 leading-relaxed text-muted">{article.excerpt}</p>
              <p className="mt-auto pt-1 text-xs text-muted">
                {formatShortDateTime(article.publishedAt)}
              </p>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

/**
 * Modo 3 — uma matéria ocupando a área inteira.
 *
 * Divide na horizontal em vez de empilhar imagem sobre texto. Imagem full-width
 * com o título embaixo daria uma medida de leitura larguíssima — e medida larga
 * é o defeito clássico de manchete "grande". Foto à esquerda, texto numa coluna
 * própria à direita: o título ganha largura de manchete de jornal, não de faixa.
 */
function UmaMateria({ article }: { article: ArticleCard }) {
  return (
    <article className="group overflow-hidden rounded-[--radius-card] border border-line bg-surface transition-colors hover:border-primary">
      <Link
        href={`/noticias/${article.slug}`}
        className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      >
        <div className="relative aspect-video overflow-hidden lg:aspect-auto lg:min-h-[26rem]">
          <RemoteImage
            src={article.imageUrl}
            sizes="(max-width: 1024px) 100vw, 680px"
            priority
            quality={60}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
          {article.category && (
            <div>
              <Badge variant="category">{article.category}</Badge>
            </div>
          )}
          <h2 className="font-display text-3xl leading-[1.04] font-extrabold tracking-tight group-hover:text-primary-text sm:text-[2.75rem]">
            {article.title}
          </h2>
          <p className="line-clamp-4 leading-relaxed text-muted">{article.excerpt}</p>
          <p className="text-xs text-muted">{formatShortDateTime(article.publishedAt)}</p>
        </div>
      </Link>
    </article>
  );
}

/**
 * Modo 4 — a faixa de plantão.
 *
 * É o modo `uma` levado ao extremo: a foto ocupa a largura inteira da página e o
 * texto vive DENTRO dela, grande. Reservado para o assunto que interrompe o dia.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTA SOBREPOSIÇÃO É SEGURA E A DA MANCHETE NÃO ERA
 * ---------------------------------------------------------------------------
 * O `news-card.tsx` conta que a manchete abandonou texto sobre foto porque o
 * degradê era TÊNUE e dependia de a foto ser escura: no tema claro o branco
 * sumia, e título longo transbordava. O `SpotlightCard` faz sobreposição até
 * hoje, e funciona, porque resolveu as três coisas — e é a receita dele que
 * está aqui, em escala maior:
 *
 *  1. **Véu opaco por si só** (95% → 45%), não um degradê de cortesia. O texto
 *     fica na metade de baixo, onde o véu está entre 80% e 95% de preto: branco
 *     ali passa de 15:1 sobre QUALQUER foto, clara ou escura.
 *  2. **`line-clamp` no título e no resumo**, para texto longo não empurrar o
 *     bloco para fora da área.
 *  3. **Altura mínima**, para a região escura existir mesmo com foto de
 *     proporção estranha.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NÃO É MAIS UM CAMPO AZUL
 * ---------------------------------------------------------------------------
 * A primeira versão usava `bg-secondary` — e colou no `DestaquesDoDia`, que é
 * `bg-secondary` full-bleed logo abaixo. Dois campos azuis sangrando, um em cima
 * do outro, viram um bloco só: o plantão sumia dentro do vizinho. Foto com véu
 * dá textura própria, e as duas réguas vermelhas fecham a borda dos dois lados.
 */
function FaixaUber({ article }: { article: ArticleCard }) {
  return (
    <section aria-label="Plantão" className="border-y-[3px] border-primary">
      <Link
        href={`/noticias/${article.slug}`}
        className="group relative block min-h-[24rem] sm:min-h-[30rem] lg:min-h-[34rem]"
      >
        <RemoteImage
          src={article.imageUrl}
          sizes="100vw"
          priority
          quality={60}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />

        {/* O véu. `to-black/45` no topo escurece a foto inteira o bastante para
            o selo e a régua não flutuarem sobre céu claro. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/45"
          aria-hidden
        />

        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-primary px-2 py-1 font-display text-[11px] font-bold tracking-[0.14em] text-white uppercase">
                Plantão
              </span>
              {article.category && (
                <span className="font-display text-[11px] font-bold tracking-[0.14em] text-white/80 uppercase">
                  {article.category}
                </span>
              )}
            </div>

            {/* Medida limitada: manchete de 1280px de largura não se lê, se
                varre. `max-w-4xl` mantém a linha em comprimento de manchete. */}
            <h2 className="font-display mt-3 line-clamp-3 max-w-4xl text-[2.25rem] leading-[1.0] font-extrabold tracking-tight text-white underline-offset-[6px] group-hover:underline sm:text-6xl lg:text-7xl">
              {article.title}
            </h2>

            <p className="mt-3 line-clamp-2 max-w-2xl leading-relaxed text-white/90 sm:text-lg">
              {article.excerpt}
            </p>

            <p className="mt-3 text-xs text-white/80">
              {formatShortDateTime(article.publishedAt)}
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
}

/**
 * A faixa `uber` sangra a margem, então precisa ficar FORA do contêiner da
 * página — por isso o componente devolve os dois casos separados e a home
 * posiciona cada um no lugar certo.
 */
export function ehFaixaLargura(layout: DestaqueLayout): boolean {
  return layout === "uber";
}

export function Destaque({
  layout,
  destaques,
}: {
  layout: DestaqueLayout;
  destaques: ArticleCard[];
}) {
  const primeira = destaques[0];
  if (!primeira) return null;

  if (layout === "uber") return <FaixaUber article={primeira} />;

  return (
    <section aria-label="Manchete">
      {layout === "uma" && <UmaMateria article={primeira} />}
      {layout === "duas" && <DuasMaterias destaques={destaques} />}
      {layout === "tres" && <TresMaterias destaques={destaques} />}
    </section>
  );
}
