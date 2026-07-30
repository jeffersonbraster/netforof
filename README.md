# NET FOR — Portal Agregador de Notícias do Fortaleza EC

> Todas as notícias do Leão em um só lugar — [netfor.club](https://netfor.club)

Monorepo pnpm + Turborepo:

| Pacote | Descrição |
|---|---|
| `apps/web` | Next.js 16 (App Router, Cache Components, Tailwind v4) |
| `packages/db` | Drizzle ORM + Neon (schema, migrations, seed) |
| `packages/scraper` | Pipeline de coleta 24/7 (6 fontes, RSS-first) + sync de jogos (ESPN) |

Plano completo em [`PLANO-NETFOR.md`](./PLANO-NETFOR.md).

## Desenvolvimento

```bash
pnpm install
cp .env.example .env        # preencher DATABASE_URL etc.
pnpm db:migrate && pnpm db:seed
pnpm dev                    # web em http://localhost:3000

pnpm --filter @netfor/scraper start    # rodar scraper de notícias
pnpm --filter @netfor/scraper matches  # sync de jogos/classificação
pnpm build && pnpm lint && pnpm typecheck
```

## Deploy (Cloudflare Workers via OpenNext)

1. `cd apps/web && npx wrangler login`
2. Criar recursos e preencher os IDs em `wrangler.jsonc`:
   ```bash
   npx wrangler kv namespace create netfor-inc-cache   # → kv_namespaces.id
   npx wrangler d1 create netfor-tag-cache             # → d1_databases.database_id
   ```
3. Secrets de runtime do Worker:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put REVALIDATE_SECRET
   ```
4. Deploy manual: `pnpm --filter @netfor/web deploy`
   Preview local: `pnpm --filter @netfor/web preview`

## Secrets do GitHub Actions

Configurar em *Settings → Secrets and variables → Actions*:

| Secret | Usado por | Descrição |
|---|---|---|
| `DATABASE_URL` | scraper, matches, deploy | Connection string do Neon |
| `REVALIDATE_SECRET` | scraper, matches, deploy | Mesmo valor do Worker (`openssl rand -hex 32`) |
| `REVALIDATE_URL` | scraper, matches | `https://netfor.club/api/revalidate` |
| `CLOUDFLARE_API_TOKEN` | deploy | Token com permissão *Workers Scripts:Edit* (+ KV/D1) |
| `CLOUDFLARE_ACCOUNT_ID` | deploy | ID da conta (dashboard → Workers) |

## Workflows

| Workflow | Gatilho | Função |
|---|---|---|
| `scraper.yml` | cron `*/20` + manual | Coleta notícias das 6 fontes e revalida o cache |
| `matches.yml` | 3x/dia + manual | Sincroniza agenda/placares/classificação (ESPN) |
| `deploy.yml` | push na `main` + manual | Build OpenNext + deploy no Cloudflare Workers |
