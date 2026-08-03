/* Hallmark · scope: app (painel interno) · genre: editorial · design-system: design.md
 * macrostructure: 13 · Index-First (o painel É uma lista de filas de trabalho)
 * nav: trilho próprio do admin · footer: nenhum (ferramenta, não página)
 * enrichment: none — tipografia e a régua vermelha carregam
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O painel nasceu antes do design.md e ficou com o vocabulário antigo do portal:
 * `rounded-lg` e `rounded-xl` em tudo, o mesmo retângulo macio que o design.md
 * abandonou de propósito. Cada tela repetia sua própria corrente de classes, e
 * duas telas nunca ficavam iguais. Aqui as peças ficam em UM lugar, com a forma
 * por função que o sistema manda: cartão quase reto, faixa reta, pílula só em
 * selo.
 *
 * Tudo aqui é Server Component: são elementos de formulário sem estado próprio,
 * e o painel inteiro funciona sem JavaScript.
 */

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Botões                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Voz dos botões, do design.md: primário é preenchimento vermelho de canto reto
 * em maiúscula condensada; secundário é contorno hairline sem preenchimento.
 *
 * `whitespace-nowrap` é regra dura de responsividade: rótulo de botão que quebra
 * em duas linhas é lido como defeito, não como intenção. Quem reflui é a linha,
 * nunca o rótulo.
 */
const BASE_BOTAO =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2";

const VARIANTES = {
  /** Ação que avança o trabalho: publicar, salvar, criar. Uma por tela. */
  primario: "bg-primary text-white hover:bg-primary/90 active:bg-primary/80",
  /** Ação normal, reversível. O padrão do painel. */
  secundario: "border border-line hover:border-primary/50 hover:bg-surface-2 active:bg-surface-2",
  /**
   * Ação destrutiva reversível (descartar, remover). Texto no vermelho legível —
   * `--primary-text`, nunca `text-primary`: a cor da marca não passa em 4,5:1.
   */
  perigo:
    "border border-line text-primary-text hover:border-primary/60 hover:bg-primary/10 active:bg-primary/15",
  /** Peso mínimo, para o que é secundário de verdade dentro de uma lista. */
  fantasma: "text-muted hover:text-foreground hover:bg-surface-2",
} as const;

type Variante = keyof typeof VARIANTES;

export function Botao({
  variante = "secundario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`${BASE_BOTAO} ${VARIANTES[variante]} disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    />
  );
}

/** Mesma voz do botão, mas navega em vez de submeter. */
export function BotaoLink({
  variante = "secundario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link {...props} className={`${BASE_BOTAO} ${VARIANTES[variante]} ${className}`} />;
}

/** Versão miúda, para a régua de ações dentro de um item de lista. */
export function BotaoMini({
  variante = "secundario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`inline-flex h-7 items-center gap-1 whitespace-nowrap px-2.5 text-xs font-semibold transition-colors ${VARIANTES[variante]} ${className}`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Superfícies                                                                */
/* -------------------------------------------------------------------------- */

/** Cartão do painel: 4px de raio, cara de impresso — não o retângulo macio. */
export function Cartao({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`rounded-[--radius-card] border border-line bg-surface ${className}`}
    />
  );
}

/**
 * Cabeçalho de tela. A régua vermelha de seção é o que amarra o painel ao
 * portal — é o mesmo sinal que abre as seções do site.
 */
export function TituloDaTela({
  children,
  descricao,
  acoes,
}: {
  children: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="regua-marca min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tight uppercase">{children}</h1>
        {descricao && <p className="mt-1 max-w-prose text-sm text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

/**
 * Retorno de ação. `role="status"` faz o leitor de tela anunciar sem roubar o
 * foco — o painel redireciona depois de escrever (POST-Redirect-GET), então o
 * aviso chega numa página nova e não teria como ser anunciado de outro jeito.
 *
 * Sucesso é silencioso por princípio (design.md): uma linha, sem comemoração.
 */
export function Aviso({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "alerta" }) {
  return (
    <p
      role="status"
      className={`mb-4 border-l-[3px] px-4 py-2.5 text-sm ${
        tom === "alerta"
          ? "border-primary bg-primary/8 text-foreground"
          : "border-line bg-surface-2"
      }`}
    >
      {children}
    </p>
  );
}

/** Lista vazia. Diz o que fazer, não só que está vazio. */
export function Vazio({ children }: { children: ReactNode }) {
  return (
    <Cartao className="px-6 py-12 text-center text-sm text-muted">{children}</Cartao>
  );
}

/* -------------------------------------------------------------------------- */
/* Formulário                                                                 */
/* -------------------------------------------------------------------------- */

const BASE_CAMPO =
  "w-full rounded-[--radius-card] border border-line bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted/70 hover:border-primary/40 focus:border-primary/60";

/**
 * Campo com rótulo real (`<label for>`), não `placeholder` fazendo as vezes de
 * rótulo — placeholder some quando se digita e deixa de existir para leitor de
 * tela. `dica` vira `aria-describedby`, então também é anunciada.
 */
export function Campo({
  id,
  rotulo,
  dica,
  children,
  obrigatorio = false,
}: {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  children: ReactNode;
  obrigatorio?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-wide uppercase">
        {rotulo}
        {obrigatorio && (
          <span className="ml-1 text-primary-text" aria-label="obrigatório">
            *
          </span>
        )}
      </label>
      {children}
      {dica && (
        <p id={`${id}-dica`} className="mt-1 text-xs text-muted">
          {dica}
        </p>
      )}
    </div>
  );
}

export function Entrada({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${BASE_CAMPO} ${className}`} />;
}

export function AreaDeTexto({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${BASE_CAMPO} leading-relaxed ${className}`} />;
}

export function Selecao({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${BASE_CAMPO} ${className}`} />;
}

/* -------------------------------------------------------------------------- */
/* Selos                                                                      */
/* -------------------------------------------------------------------------- */

const TONS_DE_SELO = {
  neutro: "border-line text-muted",
  ativo: "border-primary/40 bg-primary/10 text-primary-text",
  vivo: "border-primary bg-primary text-white",
} as const;

/**
 * Pílula é a única forma arredondada que o design.md autoriza, e só em selo.
 * Fora daqui, o painel é reto.
 */
export function Selo({
  tom = "neutro",
  children,
}: {
  tom?: keyof typeof TONS_DE_SELO;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[--radius-pill] border px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase ${TONS_DE_SELO[tom]}`}
    >
      {children}
    </span>
  );
}
