# Design — NETFOR

Sistema travado do portal. Toda página lê este arquivo antes de emitir código.
Não regenerar por página — estender ou emendar quando o sistema precisar crescer.

## Genre

editorial (portal de notícias esportivas)

## Macrostructure family

- **Home:** `20 · Ecosystem Index` — múltiplas superfícies de descoberta (destaque,
  últimas, por categoria, mais lidas). Um portal é isso; não é "conteúdo + sidebar".
- **Listagem (`/noticias`):** `13 · Index-First` — a página *é* a lista. Navegação
  como design, filtros com peso visual.
- **Matéria (`/noticias/[slug]`):** `02 · Long Document` — texto corrido, não card
  gigante. Medida de leitura curta, tipografia carrega a página.
- **Páginas de dados (agenda, classificação, vídeos):** herdam Index-First.
- **Institucionais (sobre, termos, privacidade):** Long Document.

## Nav

`N6 · Newspaper masthead` — régua dupla, wordmark à esquerda, linha de estado do
clube no lugar da data (próximo jogo / último resultado), trilho de seções abaixo.
A linha de dia de jogo é o que dá vida diária: quem abre o site vê o Leão de imediato.

**Proibido:** N1a (wordmark + links + botão à direita) — é a assinatura de IA mais
reconhecível e era o que o portal usava.

## Footer

`Ft5 · Statement` — uma frase display fechando a página, links mínimos abaixo.
**Proibido:** Ft3 (4 colunas + social + copyright miúdo).

## Theme

Tricolor do Fortaleza como âncora real, não como cor de destaque decorativa.

- `--color-paper` claro `#f5f6fa` · escuro `#0a0e1a`
- `--brand-red` `#e11d2e` — preenchimento, faixas, estado ao vivo
- `--brand-blue` `#003da5` — segunda âncora, faixas e fundo de placar
- `--primary-text` claro `#b3111f` · escuro `#ff8a94` — **o vermelho da marca não
  serve como cor de texto** (4,4:1 no claro, 3,4:1 no escuro). Este token é a
  versão legível. Nunca usar `text-primary`.

## Typography

- **Display:** Barlow Condensed 700/800, roman, `letter-spacing: -0.01em`.
  Condensada dá energia de placar e de manchete de jornal esportivo, e cabe mais
  palavra por linha — que é o que uma manchete precisa.
- **Body:** Inter 400/500/600.
- **Numerais:** Inter com `font-variant-numeric: tabular-nums` — placar e tabela
  não podem dançar.
- **Nunca italic em título.** Ênfase por peso ou cor.

## Shape

O portal tinha um vocabulário só: `rounded-lg` 40× · `rounded-xl` 18×. Tudo era o
mesmo retângulo macio. O sistema novo separa por função:

- **Cartão de matéria:** `--radius-card` 4px — quase reto, cara de impresso.
- **Faixa/placar:** 0 — reto, hard edge.
- **Pílula:** `--radius-pill` 999px — só badge e botão de filtro.
- **Régua da marca:** 3px sólida em vermelho, não barrinha arredondada.

## Motion

- Easings nomeados: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.
- **Movimento só onde tem função:** marquee no ticker de jogos (informação que
  rola), realce no card sob hover. Nada de fade-in genérico em tudo.
- `prefers-reduced-motion: reduce` derruba o marquee e todo deslocamento.

## Microinteractions

- Sucesso silencioso; sem toast comemorativo.
- Busca: debounce 250 ms, mínimo 2 caracteres, resultado ao vivo.
- Foco sempre visível, anel `--link` a 2px, nunca animado.

## CTA voice

- **Primário:** preenchimento vermelho, canto reto, texto em maiúscula condensada.
- **Secundário:** contorno hairline, sem preenchimento.
- Verbo primeiro: "Ver agenda", "Ler matéria" — nunca "Saiba mais".

## O que toda página compartilha

O wordmark, as duas âncoras do tricolor, o par Barlow Condensed + Inter, o
vocabulário de forma acima, a régua vermelha de seção e a voz dos botões.

## O que pode variar

Macroestrutura dentro da família do tipo de página, e o arquétipo de destaque da
home.

## Acessibilidade — piso, não desejo

- Contraste mínimo 4,5:1 em texto. `--primary-text` existe por causa disso.
- Skip link e `:focus-visible` próprio já implantados; manter.
- Nenhum alvo clicável em duas linhas.
