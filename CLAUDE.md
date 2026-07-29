# NET FOR — Agregador de notícias do Fortaleza EC

## Contexto

Monorepo pnpm + Turborepo. Next.js 16 (App Router, "use cache"), Tailwind v4,
Drizzle + Neon. Scraper standalone em packages/scraper rodando via GitHub Actions.
Plano completo em PLANO-NETFOR.md — SEMPRE consulte antes de decisões estruturais.
Modo de conteúdo: **Modo A (agregador puro)** — título, excerpt próprio, imagem e
link canônico para a fonte original com crédito visível.

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

```
pnpm dev                        # web em dev
pnpm --filter @netfor/scraper start   # rodar scraper local
pnpm db:generate && pnpm db:migrate   # gerar/aplicar migrations
pnpm db:seed                    # seed mínimo
pnpm build && pnpm lint && pnpm typecheck
```
