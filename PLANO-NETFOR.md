# NET FOR — Portal Agregador de Notícias do Fortaleza Esporte Clube

> **Tagline:** "Todas as notícias do Leão em um só lugar"
> **Inspiração:** netfla.com.br — porém mais moderno, mais rápido e com melhor SEO.
> **Data do plano:** Julho/2026

---

## 1. Visão Geral

Portal minimalista e tecnológico que centraliza notícias sobre o Fortaleza EC, agregando conteúdo de múltiplos portais via scraping automatizado 24/7 **sem custo de fornecedor**, com componentes de agenda de jogos, classificação, hinos e cantos da torcida, mais lidas da semana e vídeos de jogos.

**Monetização:** Google AdSense + patrocínios diretos (bets, lojas locais).
**Pilares técnicos:** SEO impecável, Core Web Vitals verdes, custo de infraestrutura ~R$ 0 (apenas domínio).

---

## 2. Stack e Decisões de Arquitetura

| Camada         | Escolha                                                             | Justificativa                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | **Next.js 16 (latest, App Router)**                                 | Cache Components (`"use cache"`), Turbopack default, React 19.2, PPR — ideal para portal de conteúdo com ISR                                                                |
| Linguagem      | **TypeScript (strict)**                                             | Padrão do Jefferson                                                                                                                                                         |
| Estilo         | **Tailwind CSS v4** + componentes próprios                          | Minimalismo, bundle pequeno, sem peso de lib de UI                                                                                                                          |
| Banco          | **Neon (PostgreSQL serverless)**                                    | Free tier generoso, driver HTTP `@neondatabase/serverless`                                                                                                                  |
| ORM            | **Drizzle ORM**                                                     | Mais leve que Prisma em serverless/edge (cold start), schema-first, type-safe. (Alternativa: Prisma, se preferir manter familiaridade do GrupoHub — o plano funciona igual) |
| Scraper        | **Script TS standalone + GitHub Actions cron**                      | 100% gratuito, roda 24/7 a cada 20 min, sem servidor                                                                                                                        |
| Hospedagem     | **Cloudflare Workers (via OpenNext `@opennextjs/cloudflare`)**      | **Free tier permite uso comercial** (Vercel Hobby NÃO permite ads/monetização). CDN global, cache agressivo                                                                 |
| Imagens        | Proxy/otimização própria via `next/image` + remotePatterns          | Imagens dos portais originais servidas com resize (mesma técnica do netfla via thumbor próprio — aqui usamos Cloudflare Image Resizing ou `next/image`)                     |
| Dados de jogos | **API-Football (free tier, 100 req/dia)** com cache pesado no banco | Agenda, resultados e classificação sem scraping frágil                                                                                                                      |
| Monorepo       | **pnpm workspaces + Turborepo**                                     | Compartilhar schema do banco entre web e scraper                                                                                                                            |

### ⚠️ Nota importante sobre hospedagem

A Vercel Hobby (grátis) proíbe sites comerciais (ads/patrocínio). Como a monetização é objetivo desde o dia 1, as opções são:

1. **Cloudflare Workers + OpenNext (recomendado)** — grátis e comercial permitido. Limite free: 100k requests/dia (sobra muito para começar).
2. Vercel Pro (US$ 20/mês) — DX melhor, mas tem custo.

O código Next.js é o mesmo nos dois casos; só muda o adapter de deploy.

### ⚠️ Nota jurídica sobre o conteúdo (decidir na Fase 0)

- **Modo A — Agregador puro (recomendado para lançar):** armazena título, resumo (2–3 frases próprias), imagem e **link canônico para a fonte original** com crédito visível. Modelo Google News/Flipboard — juridicamente mais seguro.
- **Modo B — Reescrita com IA (como o netfla aparenta fazer):** o pipeline reescreve a matéria com LLM antes de publicar, sempre citando a fonte. Gera páginas de artigo completas (melhor para SEO/AdSense), mas tem custo de API e zona cinzenta de direitos autorais. O plano deixa o pipeline pronto para os dois modos via flag `REWRITE_MODE`.
- Publicidade de bets no Brasil é regulamentada (Lei 14.790/2023 + portarias SPA/MF): exigir selo "+18", mensagens de jogo responsável e só anunciar casas licenciadas.

---

## 3. Estrutura do Monorepo

```
netfor/
├── apps/
│   └── web/                        # Next.js 16
│       ├── src/
│       │   ├── app/
│       │   │   ├── (site)/
│       │   │   │   ├── page.tsx                  # Home
│       │   │   │   ├── noticias/
│       │   │   │   │   ├── page.tsx              # Listagem + paginação
│       │   │   │   │   └── [slug]/page.tsx       # Artigo (Modo B) ou preview+link (Modo A)
│       │   │   │   ├── agenda/page.tsx           # Próximos jogos + calendário
│       │   │   │   ├── classificacao/page.tsx    # Tabela do Brasileirão
│       │   │   │   ├── cantos-da-torcida/
│       │   │   │   │   ├── page.tsx              # Lista de hinos e cantos
│       │   │   │   │   └── [slug]/page.tsx       # Letra individual
│       │   │   │   ├── videos/page.tsx           # Últimos jogos e gols
│       │   │   │   └── sobre/page.tsx
│       │   │   ├── api/
│       │   │   │   ├── views/route.ts            # Incrementa view count (mais lidas)
│       │   │   │   └── revalidate/route.ts       # Webhook do scraper p/ revalidar cache
│       │   │   ├── sitemap.ts                    # Sitemap dinâmico
│       │   │   ├── robots.ts
│       │   │   ├── noticias/rss/route.ts         # Feed RSS próprio (Google News)
│       │   │   └── layout.tsx
│       │   ├── components/                       # UI pura (sem lógica de dados)
│       │   ├── modules/                          # Clean architecture por feature
│       │   │   ├── news/       (domain, repository, queries)
│       │   │   ├── matches/    (agenda, resultados, classificação)
│       │   │   ├── chants/     (cantos e hinos)
│       │   │   └── analytics/  (views, mais lidas)
│       │   └── lib/            (db client, utils, seo helpers)
│       └── next.config.ts
├── packages/
│   ├── db/                         # Drizzle: schema, migrations, client — compartilhado
│   └── scraper/                    # Pipeline de coleta
│       ├── src/
│       │   ├── sources/            # 1 adapter por portal (Strategy pattern)
│       │   │   ├── ge-globo.ts
│       │   │   ├── fortaleza1918.ts
│       │   │   ├── diario-do-nordeste.ts
│       │   │   ├── sou-fortaleza.ts
│       │   │   ├── opovo.ts
│       │   │   └── espn.ts
│       │   ├── core/               # fetch com retry, parser RSS, parser HTML, dedupe, slugify
│       │   ├── rewrite/            # (Modo B) reescrita via LLM — atrás de flag
│       │   ├── matches/            # sync API-Football (agenda/tabela)
│       │   └── index.ts            # orquestrador (roda tudo e loga resultado)
│       └── package.json
├── .github/workflows/
│   ├── scraper.yml                 # cron */20 — notícias
│   ├── matches.yml                 # cron 3x/dia — agenda/classificação
│   └── deploy.yml                  # deploy no push para main
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

**Princípios de arquitetura limpa aplicados:**

- `packages/db` é a única fonte de verdade do schema; web e scraper importam dele.
- Cada fonte de scraping é um adapter que implementa a interface `NewsSource` (`fetchLatest(): Promise<RawArticle[]>`) — adicionar portal novo = criar 1 arquivo.
- Componentes de UI não acessam banco; recebem dados de queries dos `modules/` (Server Components).
- Zero lógica de negócio em route handlers — eles só orquestram.

---

## 4. Modelagem do Banco (Neon + Drizzle)

```
sources          — id, name, slug, baseUrl, logoUrl, active
articles         — id, sourceId, title, slug (unique), excerpt, content (nullable — só Modo B),
                   originalUrl (unique), imageUrl, category, publishedAt, scrapedAt,
                   isHighlighted, status (published|hidden), contentHash (dedupe)
article_views    — articleId, day (date), count        # agregado por dia p/ "mais lidas da semana"
matches          — id, externalId, competition, round, homeTeam, awayTeam, homeLogo, awayLogo,
                   homeScore, awayScore, stadium, kickoffAt, status (scheduled|live|finished)
standings        — position, teamName, teamLogo, points, played, wins, draws, losses,
                   goalsFor, goalsAgainst, updatedAt
chants           — id, title, slug, lyrics, category (hino|canto), audioUrl (nullable), order
```

**Dedupe do scraper (2 níveis):**

1. `originalUrl` unique — nunca insere a mesma matéria duas vezes.
2. `contentHash` = hash normalizado do título — captura a MESMA notícia publicada por portais diferentes; a segunda vira "cobertura relacionada" em vez de card duplicado na home (diferencial sobre o netfla, que mostra duplicatas).

---

## 5. Pipeline de Scraping (24/7, custo zero)

### Estratégia por fonte: RSS-first, HTML-fallback

1. **Descoberta de RSS:** na Fase 3, para cada portal, inspecionar `<link rel="alternate" type="application/rss+xml">` e caminhos comuns (`/rss`, `/feed`, `/arc/outboundfeeds/rss/` para sites Arc Publishing como Diário do Nordeste e O Povo; ge.globo tem feeds RSS por editoria). RSS é mais estável, mais leve e mais "educado" que scraping de HTML.
2. **Fallback HTML:** `fetch` + **Cheerio** com seletores isolados por adapter. Sem Puppeteer/Playwright (pesado e desnecessário — todos os portais listados renderizam server-side).
3. **Regras de boa vizinhança:** respeitar `robots.txt`, User-Agent identificado (`NetForBot/1.0 (+https://netfor.com.br)`), máximo 1 req/seg por domínio, timeout 10s, retry com backoff (máx 2).

### Fontes iniciais

| Portal                   | URL de partida                                 | Abordagem provável                            |
| ------------------------ | ---------------------------------------------- | --------------------------------------------- |
| ge (Globo Esporte)       | ge.globo.com/ce/futebol/times/fortaleza/       | RSS da editoria ou HTML (estrutura estável)   |
| Fortaleza 1918 (oficial) | fortaleza1918.com.br/central-de-midia/         | WordPress → quase certo ter `/feed`           |
| Diário do Nordeste       | diariodonordeste.verdesmares.com.br/...        | Arc Publishing → outboundfeeds RSS            |
| Sou Fortaleza            | soufortaleza.com/noticias-do-fortaleza/        | WordPress → `/feed`                           |
| O Povo                   | opovo.com.br/esportes/futebol/times/fortaleza/ | HTML ou RSS de editoria                       |
| ESPN Brasil              | espn.com.br/futebol/time/_/id/6272/fortaleza   | HTML (ou API pública não documentada da ESPN) |

### Execução: GitHub Actions cron

```yaml
# .github/workflows/scraper.yml (essência)
on:
  schedule:
    - cron: "*/20 * * * *" # a cada 20 min (GitHub não garante pontualidade exata — ok p/ notícias)
  workflow_dispatch: # disparo manual p/ debug
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - checkout → pnpm install (com cache) → pnpm --filter scraper start
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

- Ao final, o scraper chama `POST /api/revalidate` (com secret) para invalidar o cache da home e listagens — o site atualiza segundos após novas matérias.
- **Custo:** repositório público = minutos ilimitados; privado = ~2.000 min/mês grátis (o job leva ~1–2 min × 72 execuções/dia ≈ dentro do limite se otimizado; se apertar, reduzir para `*/30`).
- `matches.yml` roda 3x/dia + a cada 15 min em dia de jogo (condição no script) para placar ao vivo dentro das 100 req/dia da API-Football.

### Modo B (opcional): reescrita com IA

- Flag `REWRITE_MODE=true` ativa etapa que envia título+corpo extraído para um LLM com prompt fixo: reescrever em 4–6 parágrafos, tom jornalístico, citar a fonte, gerar meta description e categoria.
- Recomendação de custo: modelo barato (ex.: Haiku) ou o Ollama/Gemma local que você já explora — o scraper pode rodar localmente no seu Mac via `launchd` como alternativa ao Actions se quiser reescrita gratuita com modelo local.

---

## 6. Design System — "minimalista e tecnológico"

**Identidade:**

- Cores do Leão: vermelho `#E11D2E`, azul `#003DA5`, branco — sobre base **dark** `#0A0E1A` (azul-noite quase preto) com superfícies `#111827`. Acento vermelho para CTAs/destaques, azul para links/tags.
- Tipografia: **Inter** (UI) + **Archivo Expanded/Black** (manchetes — dá o ar "esportivo tech"). `next/font` self-hosted.
- Detalhes tecnológicos: bordas 1px com brilho sutil, glassmorphism leve no header sticky, micro-animações com `View Transitions` do React 19.2 (navegação entre cards → artigo com transição da imagem), skeleton loading.
- Mobile-first: 70%+ do tráfego de portal de time é mobile.

**Melhorias sobre o netfla (auditoria feita na página deles):**

1. Netfla mostra a MESMA notícia duplicada em "Destaques" e "Últimas" → Net For deduplica e agrupa cobertura relacionada.
2. Netfla repete o widget de jogos 2x na home → Net For usa 1 ticker horizontal de jogos no topo (scroll snap) + página /agenda completa.
3. Adicionar **classificação do Brasileirão** na home (netfla só linka Flashscore externo).
4. Adicionar **filtro por fonte e categoria** nas notícias (Mercado da Bola, Brasileirão, Base, Feminino, Copa do Nordeste).
5. Barra de "última atualização há X min" — transmite o valor do 24/7.
6. Dark/light toggle (netfla não tem).
7. Badge da fonte original em cada card (transparência = confiança + proteção jurídica).

**Componentes da Home (ordem):**

1. Header sticky (logo, nav, busca, toggle tema)
2. **Match ticker** — próximos 4 jogos, escudos, data/hora, estádio, competição
3. **Hero** — destaque principal (imagem grande) + 4 secundárias em grid
4. Bloco AdSense (leaderboard)
5. **Últimas notícias** — grid infinito com paginação/`loadMore`
6. Sidebar (desktop): **Mais lidas da semana** (ranking 1–5), **Classificação** (mini-tabela, posição do Fortaleza destacada), **Cantos da torcida** (3 em destaque), bloco de patrocínio
7. **Vídeos/últimos jogos** — cards com placar
8. Footer completo (fontes agregadas com crédito, redes, RSS, Google News)

---

## 7. SEO e Performance (foco máximo)

**SEO técnico:**

- `generateMetadata` por página: title pattern `{título} | NET FOR`, description do excerpt, canonical (⚠️ no Modo A, canonical apontando para a fonte original ou `noindex` nas páginas de preview — evita punição por conteúdo duplicado; no Modo B, canonical próprio).
- **JSON-LD:** `NewsArticle` (artigos), `SportsEvent` (jogos da agenda), `BreadcrumbList`, `WebSite` com SearchAction.
- `app/sitemap.ts` dinâmico (artigos + páginas estáticas, `lastModified` real) + **news-sitemap** separado (últimas 48h, protocolo Google News) + `robots.ts`.
- **Feed RSS próprio** em `/noticias/rss` + cadastro no **Google News Publisher Center** (o netfla tem e é fonte relevante de tráfego).
- OG images dinâmicas com `next/og` (imagem da matéria + logo + categoria).
- URLs: `/noticias/{slug}` curtos, sem IDs.

**Performance:**

- Server Components por padrão; client components só em ticker ao vivo, busca, toggle e loadMore.
- `"use cache"` (Cache Components) nas queries da home com revalidação por tag (`revalidateTag('articles')` chamada pelo webhook do scraper) — página estática na borda, atualizada em segundos.
- `next/image` com `sizes` corretos, prioridade só no hero, placeholder blur.
- Fonts self-hosted com `display: swap`; zero layout shift (dimensões fixas nos cards).
- Ads carregados com lazy + espaço reservado (CLS = 0).
- Meta: Lighthouse ≥ 95 nas quatro categorias; LCP < 2s em 4G.

---

## 8. Monetização

1. **Google AdSense** — requisito: conteúdo próprio suficiente (páginas de cantos, sobre, agenda ajudam na aprovação; Modo B acelera aprovação). Posições: leaderboard pós-hero, in-feed a cada 6 cards, sidebar, in-article (Modo B).
2. **Patrocínio bets** — banner fixo sidebar + naming de seção ("Agenda oferecida por..."). Compliance: só casas licenciadas SPA/MF, selo +18, jogo responsável.
3. Futuro: newsletter (captura de e-mail desde o dia 1 com Resend free tier), push notifications de gol/notícia (web push, gratuito).

---

## 9. Fases de Execução no Claude Code

> Cada fase é um prompt independente. Execute em ordem, revise, commite. Sugestão: use seu workflow-opencode/Claude Code com o CLAUDE.md da seção 10 na raiz.

### Fase 0 — Decisões (manual, 10 min)

- [ ] Modo A (agregador) ou Modo B (reescrita IA)? → recomendo lançar no A, migrar pro B depois.
- [ ] Registrar domínio (netfor.com.br) e criar conta Cloudflare, Neon, API-Football.
- [ ] Repo GitHub (público = Actions ilimitado).

### Fase 1 — Fundação

**Prompt:** "Crie o monorepo netfor com pnpm workspaces + Turborepo conforme o PLANO-NETFOR.md seção 3: apps/web com Next.js 16 (create-next-app latest, TypeScript, Tailwind v4, App Router, src dir), packages/db com Drizzle ORM + driver @neondatabase/serverless e o schema completo da seção 4 com migrations, e packages/scraper vazio com tsconfig. Configure ESLint + Prettier compartilhados, scripts no turbo.json e .env.example. Rode a migration no Neon e valide com um seed mínimo (1 source, 2 articles, 3 chants)."

### Fase 2 — Design System + Layout

**Prompt:** "Implemente o design system da seção 6 do PLANO-NETFOR.md: tokens no Tailwind (cores dark tricolor, tipografia Inter + Archivo via next/font), componentes base (Card de notícia com badge de fonte, Badge, Button, Skeleton, SectionTitle), Header sticky com glassmorphism e toggle dark/light, e Footer. Crie a home com dados mockados do seed seguindo a ordem de componentes da seção 6. Mobile-first, zero layout shift."

### Fase 3 — Scraper

**Prompt:** "Implemente packages/scraper conforme seção 5 do PLANO-NETFOR.md: interface NewsSource, core (fetch com retry/backoff/UA identificado, parser RSS com fast-xml-parser, parser HTML com cheerio, dedupe por originalUrl e contentHash, slugify), e os 6 adapters da tabela de fontes. Para cada portal, PRIMEIRO detecte se existe feed RSS (link alternate, /feed, /rss, /arc/outboundfeeds/rss/) e prefira RSS; só use HTML se não houver. Orquestrador roda todas as fontes em paralelo com Promise.allSettled, loga resumo (novos/duplicados/erros por fonte) e chama o webhook de revalidate. Teste local contra os sites reais e me mostre o resultado de uma execução completa."

### Fase 4 — Site com dados reais

**Prompt:** "Conecte a home e crie as páginas /noticias (listagem com paginação, filtro por categoria e fonte), /noticias/[slug] (Modo A: título, excerpt, imagem, crédito e CTA 'Ler matéria completa na fonte'), /cantos-da-torcida e /cantos-da-torcida/[slug], /sobre. Use Server Components + 'use cache' com tags e crie /api/revalidate (protegido por secret) e /api/views (incrementa article_views; a home consome 'mais lidas da semana' agregando os últimos 7 dias). View Transitions na navegação card→artigo."

### Fase 5 — Agenda, classificação e vídeos

**Prompt:** "Implemente packages/scraper/src/matches sincronizando API-Football (team Fortaleza, temporada atual): próximos jogos, resultados e classificação do Brasileirão nas tabelas matches/standings, com no máx. 100 req/dia (cache agressivo, só busca ao vivo em dia de jogo). No web: match ticker da home, página /agenda (calendário + resultados com placares), /classificacao (tabela completa, linha do Fortaleza destacada) e /videos (cards de últimos jogos com placar e link para vídeo/matéria)."

### Fase 6 — SEO completo

**Prompt:** "Implemente TODA a seção 7 do PLANO-NETFOR.md: generateMetadata em todas as páginas, JSON-LD (NewsArticle, SportsEvent, BreadcrumbList, WebSite), sitemap.ts + news-sitemap das últimas 48h, robots.ts, feed RSS em /noticias/rss, OG images dinâmicas com next/og. No Modo A, aplique a estratégia de canonical/noindex descrita para evitar conteúdo duplicado. Valide o JSON-LD e rode Lighthouse — meta ≥95 em tudo."

### Fase 7 — Deploy + automação

**Prompt:** "Configure deploy do apps/web no Cloudflare Workers com @opennextjs/cloudflare (wrangler.jsonc, build, env vars, domínio). Crie .github/workflows/scraper.yml (cron */20 + workflow_dispatch), matches.yml (3x/dia) e deploy.yml (push na main), todos com cache de pnpm e secrets documentados no README. Faça o primeiro deploy e uma execução real do scraper via workflow_dispatch."

### Fase 8 — Monetização + lançamento

**Prompt:** "Adicione os slots de anúncio da seção 8 com lazy load e espaço reservado (CLS 0), componente de patrocínio com selo +18/jogo responsável, captura de e-mail para newsletter (Resend), e página de política de privacidade/termos (LGPD, cookies, AdSense). Checklist final: Search Console, Google News Publisher Center, Analytics (Umami self-hosted no Workers ou GA4)."

---

## 10. CLAUDE.md sugerido (raiz do repo)

```markdown
# NET FOR — Agregador de notícias do Fortaleza EC

## Contexto

Monorepo pnpm + Turborepo. Next.js 16 (App Router, "use cache"), Tailwind v4,
Drizzle + Neon. Scraper standalone em packages/scraper rodando via GitHub Actions.
Plano completo em PLANO-NETFOR.md — SEMPRE consulte antes de decisões estruturais.

## Regras

- TypeScript strict; sem `any`.
- Clean architecture: UI não acessa banco; lógica de dados vive em src/modules/*.
- Server Components por padrão; "use client" só com justificativa.
- Todo schema/migration vive em packages/db — nunca duplicar tipos.
- Scraper: novo portal = novo adapter implementando NewsSource. Respeitar robots.txt,
  1 req/s por domínio, UA "NetForBot/1.0".
- SEO é feature de primeira classe: toda página nova nasce com generateMetadata,
  JSON-LD quando aplicável e entrada no sitemap.
- Performance: zero layout shift; imagens sempre com sizes; nada de lib pesada
  sem discussão (bundle é sagrado).
- Commits em português, conventional commits (feat/fix/chore).

## Comandos

pnpm dev # web em dev
pnpm --filter scraper start # rodar scraper local
pnpm db:generate && pnpm db:migrate
pnpm build && pnpm lint
```

---

## 11. Custos e Riscos

| Item               | Custo               | Risco / Mitigação                                                                   |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------- |
| Cloudflare Workers | R$ 0                | Limite 100k req/dia → cache na borda resolve; upgrade US$5/mês se explodir          |
| Neon free          | R$ 0                | 0,5 GB → texto puro dura anos; job mensal de limpeza de artigos >12 meses           |
| GitHub Actions     | R$ 0 (repo público) | Cron atrasa em horário de pico → aceitável para notícias                            |
| API-Football free  | R$ 0                | 100 req/dia → cache agressivo já previsto                                           |
| Domínio .com.br    | ~R$ 40/ano          | —                                                                                   |
| Scraping           | R$ 0                | Portal muda HTML → RSS-first minimiza; alerta no log quando adapter retorna 0 itens |
| Jurídico           | —                   | Modo A + crédito visível + robots.txt respeitado; remover fonte se solicitado       |

**Total para operar: ~R$ 40/ano.**
